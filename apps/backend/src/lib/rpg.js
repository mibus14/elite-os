// ─── RPG Engine ───────────────────────────────────────────────────────────────
// Core RPG logic: XP awards, debuffs, combos, streaks, death checks.
// All functions accept a `prisma` instance — no new PrismaClient instances created here.

// ─── Class XP multipliers ─────────────────────────────────────────────────────
const CLASS_BONUSES = {
  Warrior:  { gym: 1.5, cardio: 1.3, nutrition: 1.0, habits: 1.0, learning: 1.0, finance: 1.0 },
  Monk:     { gym: 1.0, cardio: 1.0, nutrition: 1.2, habits: 1.5, learning: 1.2, finance: 1.0 },
  Sage:     { gym: 1.0, cardio: 1.0, nutrition: 1.0, habits: 1.0, learning: 1.5, finance: 1.3 },
  Assassin: { gym: 1.2, cardio: 1.2, nutrition: 1.2, habits: 1.2, learning: 1.2, finance: 1.2 },
  Merchant: { gym: 1.0, cardio: 1.0, nutrition: 1.0, habits: 1.0, learning: 1.3, finance: 1.5 },
};

// ─── Stat gains per module ────────────────────────────────────────────────────
const STAT_GAINS = {
  gym:       { statStr: 2, statVit: 1 },
  cardio:    { statStr: 1, statVit: 2 },
  nutrition: { statVit: 2, statDis: 1 },
  habits:    { statDis: 2, statWis: 1 },
  learning:  { statInt: 2, statWis: 1 },
  finance:   { statGol: 2, statWis: 1 },
};

// ─── Debuff templates ─────────────────────────────────────────────────────────
const DEBUFF_TEMPLATES = {
  fatigue:  { name: 'Fatiga',         description: 'Estás agotado. Todo da 50% XP por 24h.',            icon: '😴', xpMultiplier: 0.5,  hours: 24 },
  weakness: { name: 'Debilidad',      description: 'Tu cuerpo falla. Gym da 0 XP hasta entrenar 2 días.', icon: '🩹', xpMultiplier: 0.25, hours: 48 },
  despair:  { name: 'Desesperación',  description: 'Has caído en la oscuridad. XP reducido 75% por 72h.', icon: '💀', xpMultiplier: 0.25, hours: 72 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function isYesterday(date) {
  const d = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(d, yesterday);
}

/**
 * Recalculates and persists level + rank from current XP.
 */
async function recalcRankLevel(userId, prisma) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
  const xp = user.xp;
  const level = Math.floor(xp / 500) + 1;
  let rank = 'Bronze';
  if (xp >= 10001)      rank = 'Diamond';
  else if (xp >= 5001)  rank = 'Platinum';
  else if (xp >= 2001)  rank = 'Gold';
  else if (xp >= 501)   rank = 'Silver';
  await prisma.user.update({ where: { id: userId }, data: { level, rank } });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * awardXP(userId, module, baseXP, prisma)
 *
 * 1. Skips everything if user is in penitence.
 * 2. Gets active debuffs and calculates the lowest debuff multiplier.
 * 3. Applies class bonus for the given module.
 * 4. For Assassin: checks today's combo — if all 6 modules done → x2 bonus;
 *    if anything was missed on a completed day → 0 XP for that action.
 * 5. Math.round the final XP.
 * 6. Increments user.xp.
 * 7. Recalculates level + rank.
 * 8. Applies stat gains.
 *
 * Returns { finalXP, debuffMultiplier, classMultiplier }.
 */
async function awardXP(userId, module, baseXP, prisma) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { class: true, inPenitence: true, statStr: true, statInt: true, statVit: true, statDis: true, statWis: true, statGol: true },
  });

  if (user.inPenitence) {
    return { finalXP: 0, debuffMultiplier: 1, classMultiplier: 1, blocked: 'penitence' };
  }

  // 1. Active debuffs → pick the lowest multiplier
  const now = new Date();
  const activeDebuffs = await prisma.debuff.findMany({
    where: { userId, active: true, expiresAt: { gt: now } },
  });

  const debuffMultiplier = activeDebuffs.length > 0
    ? Math.min(...activeDebuffs.map((d) => d.xpMultiplier))
    : 1;

  // 2. Class bonus
  const classConfig = CLASS_BONUSES[user.class] || CLASS_BONUSES.Warrior;
  let classMultiplier = classConfig[module] || 1.0;

  // 3. Assassin special rule
  if (user.class === 'Assassin') {
    const today = startOfToday();
    const combo = await prisma.dailyCombo.findUnique({
      where: { userId_date: { userId, date: today } },
    });
    if (combo && combo.comboActive) {
      // All 6 done → x2 on top of base assassin bonus
      classMultiplier = classMultiplier * 2;
    }
    // If combo exists but isn't active yet, assassin just uses base 1.2
    // Assassin gets 0 XP only when explicitly penalized via checkDeath / debuffs
  }

  // 4. Final XP
  const finalXP = Math.round(baseXP * classMultiplier * debuffMultiplier);

  if (finalXP <= 0) {
    return { finalXP: 0, debuffMultiplier, classMultiplier, blocked: 'zero_xp' };
  }

  // 5. Increment XP
  await prisma.user.update({
    where: { id: userId },
    data: { xp: { increment: finalXP } },
  });

  // 6. Recalc level + rank
  await recalcRankLevel(userId, prisma);

  // 7. Stat gains
  const statGain = STAT_GAINS[module];
  if (statGain) {
    const statUpdate = {};
    for (const [stat, gain] of Object.entries(statGain)) {
      statUpdate[stat] = { increment: gain };
    }
    await prisma.user.update({ where: { id: userId }, data: statUpdate });
  }

  return { finalXP, debuffMultiplier, classMultiplier };
}

/**
 * checkAndApplyDebuffs(userId, prisma)
 *
 * Checks failStreak and applies the appropriate debuff if needed.
 * - failStreak === 1 → fatigue (24h)
 * - failStreak === 2 → weakness (48h)
 * - failStreak >= 3  → despair (72h)
 *
 * Deactivates any existing debuffs of the same type before creating a new one.
 * Returns the debuff created (or null).
 */
async function checkAndApplyDebuffs(userId, prisma) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failStreak: true },
  });

  const { failStreak } = user;
  if (failStreak < 1) return null;

  let templateKey;
  if (failStreak >= 3)      templateKey = 'despair';
  else if (failStreak === 2) templateKey = 'weakness';
  else                       templateKey = 'fatigue';

  const template = DEBUFF_TEMPLATES[templateKey];
  const expiresAt = new Date(Date.now() + template.hours * 60 * 60 * 1000);

  // Deactivate any active debuff of the same type
  await prisma.debuff.updateMany({
    where: { userId, type: templateKey, active: true },
    data: { active: false },
  });

  const debuff = await prisma.debuff.create({
    data: {
      userId,
      type: templateKey,
      name: template.name,
      description: template.description,
      icon: template.icon,
      xpMultiplier: template.xpMultiplier,
      expiresAt,
      active: true,
    },
  });

  return debuff;
}

/**
 * checkDeath(userId, prisma)
 *
 * If failStreak >= 3 → increment deathCount, set inPenitence=true, reset failStreak=0.
 * Returns true if the user just died, false otherwise.
 */
async function checkDeath(userId, prisma) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failStreak: true, inPenitence: true },
  });

  if (user.failStreak >= 3 && !user.inPenitence) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        deathCount: { increment: 1 },
        inPenitence: true,
        failStreak: 0,
      },
    });
    return true;
  }

  return false;
}

/**
 * updateCombo(userId, module, prisma)
 *
 * Marks the given module as done in today's DailyCombo record (upsert).
 * After marking, checks if >= 3 modules are done → comboActive = true.
 * If all 6 are done → comboMultiplier = 2.0; otherwise 1.5 when >= 3.
 * Returns the updated combo record.
 */
async function updateCombo(userId, module, prisma) {
  const today = startOfToday();

  // Map module name → DailyCombo field
  const moduleField = {
    gym:       'gymDone',
    cardio:    'cardioDone',
    nutrition: 'nutritionDone',
    habits:    'habitsDone',
    learning:  'learningDone',
    finance:   'financeDone',
  }[module];

  if (!moduleField) return null;

  // Upsert today's combo record
  const combo = await prisma.dailyCombo.upsert({
    where: { userId_date: { userId, date: today } },
    create: {
      userId,
      date: today,
      [moduleField]: true,
    },
    update: {
      [moduleField]: true,
    },
  });

  // Re-fetch to get all current fields after update
  const updated = await prisma.dailyCombo.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  const doneCount = [
    updated.gymDone,
    updated.cardioDone,
    updated.nutritionDone,
    updated.habitsDone,
    updated.learningDone,
    updated.financeDone,
  ].filter(Boolean).length;

  const allDone = doneCount === 6;
  const comboActive = doneCount >= 3;
  const comboMultiplier = allDone ? 2.0 : comboActive ? 1.5 : 1.0;

  const finalCombo = await prisma.dailyCombo.update({
    where: { userId_date: { userId, date: today } },
    data: { comboActive, comboMultiplier },
  });

  // If combo just became active (or stays active), update user comboStreak
  if (comboActive) {
    await prisma.user.update({
      where: { id: userId },
      data: { comboStreak: { increment: 0 } }, // streak updated in checkAndUpdateStreak
    });
  }

  return finalCombo;
}

/**
 * checkAndUpdateStreak(userId, prisma)
 *
 * Compares lastActiveDate to today:
 * - If already today → no change.
 * - If yesterday    → streak++ (up to longestStreak), update lastActiveDate.
 * - If older/null   → streak resets to 1, failStreak++.
 *
 * Also calls checkDeath if failStreak reaches the threshold.
 * Returns { streak, failStreak, died }.
 */
async function checkAndUpdateStreak(userId, prisma) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streak: true, longestStreak: true, failStreak: true, lastActiveDate: true, comboStreak: true },
  });

  const today = startOfToday();

  // Already active today — nothing to do
  if (user.lastActiveDate && isSameDay(user.lastActiveDate, today)) {
    return { streak: user.streak, failStreak: user.failStreak, died: false };
  }

  let newStreak;
  let newFailStreak = user.failStreak;
  let newComboStreak = user.comboStreak;

  if (user.lastActiveDate && isYesterday(user.lastActiveDate)) {
    // Consecutive day
    newStreak = user.streak + 1;
    newFailStreak = 0; // reset fail streak on activity
    newComboStreak = user.comboStreak + 1;
  } else {
    // Gap — reset streak, bump failStreak
    newStreak = 1;
    newFailStreak = user.failStreak + 1;
    newComboStreak = 0;
  }

  const newLongest = Math.max(user.longestStreak, newStreak);

  await prisma.user.update({
    where: { id: userId },
    data: {
      streak: newStreak,
      longestStreak: newLongest,
      failStreak: newFailStreak,
      comboStreak: newComboStreak,
      lastActiveDate: today,
    },
  });

  // Apply debuffs based on new failStreak
  await checkAndApplyDebuffs(userId, prisma);

  // Check if user hit YOU DIED
  const died = await checkDeath(userId, prisma);

  return { streak: newStreak, failStreak: newFailStreak, died };
}

module.exports = {
  CLASS_BONUSES,
  STAT_GAINS,
  DEBUFF_TEMPLATES,
  awardXP,
  checkAndApplyDebuffs,
  checkDeath,
  updateCombo,
  checkAndUpdateStreak,
};
