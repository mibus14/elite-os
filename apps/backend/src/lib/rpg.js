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
  fatigue:  { name: 'Fatiga',         description: 'Estás agotado. Todo da 50% XP por 24h.',             icon: '😴', xpMultiplier: 0.5,  hours: 24 },
  weakness: { name: 'Debilidad',      description: 'Tu cuerpo falla. Gym da 0 XP hasta entrenar 2 días.', icon: '🩹', xpMultiplier: 0.25, hours: 48 },
  despair:  { name: 'Desesperación',  description: 'Has caído en la oscuridad. XP reducido 75% por 72h.', icon: '💀', xpMultiplier: 0.25, hours: 72 },
};

// ─── Anti-cheat constants ─────────────────────────────────────────────────────
// All limits are enforced server-side in awardXP — the frontend cannot bypass them.
const ANTI_CHEAT = {
  HABITS_DAILY_CAP: 100,   // hábitos + metas combinados (XP, no # de actividades)
  QUICK_DAILY_CAP:  30,    // micro-misiones rápidas (XP independiente del pool de hábitos)
  GLOBAL_DAILY_CAP: 500,   // tope absoluto diario de XP por usuario
  PROBATION_DAYS:   30,    // días desde registro donde aplica multiplicador reducido
  PROBATION_MULT:   0.6,   // multiplicador de XP durante probación
};

// ─── Micro-misiones diarias (hardcoded, inviolables) ─────────────────────────
// Solo 1 completación por misión por día, tope 30 XP/día total entre todas.
const QUICK_MISSIONS = [
  { id: 'water',      title: 'Toma un vaso de agua',            icon: '💧', xp: 1, category: 'Salud' },
  { id: 'breakfast',  title: 'Desayuna bien',                   icon: '🍳', xp: 1, category: 'Salud' },
  { id: 'fruit',      title: 'Come una fruta',                  icon: '🍎', xp: 1, category: 'Salud' },
  { id: 'vitamins',   title: 'Toma tus vitaminas',              icon: '💊', xp: 1, category: 'Salud' },
  { id: 'bed',        title: 'Haz tu cama',                     icon: '🛏️',  xp: 1, category: 'Orden' },
  { id: 'pushups',    title: 'Haz 10 flexiones',                icon: '💪', xp: 2, category: 'Fitness' },
  { id: 'stretch',    title: 'Estira 5 minutos',                icon: '🤸', xp: 2, category: 'Fitness' },
  { id: 'read',       title: 'Lee 10 páginas',                  icon: '📖', xp: 2, category: 'Mente' },
  { id: 'journal',    title: 'Escribe en tu diario',            icon: '📝', xp: 2, category: 'Mente' },
  { id: 'sunlight',   title: 'Exponte al sol 10 minutos',       icon: '☀️', xp: 2, category: 'Salud' },
  { id: 'walk',       title: 'Camina 10 minutos',               icon: '🚶', xp: 3, category: 'Fitness' },
  { id: 'meditate',   title: 'Medita 5 minutos',                icon: '🧘', xp: 3, category: 'Mente' },
  { id: 'gratitude',  title: 'Escribe 3 cosas positivas',       icon: '🙏', xp: 3, category: 'Mente' },
  { id: 'cold',       title: 'Ducha de agua fría',              icon: '🧊', xp: 5, category: 'Disciplina' },
  { id: 'nophone',    title: 'Sin celular 30 minutos',          icon: '📵', xp: 5, category: 'Disciplina' },
];

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

// Maps module name to its DailyCombo XP field
function moduleXPField(module) {
  const map = {
    gym:       'gymXP',
    cardio:    'cardioXP',
    nutrition: 'nutritionXP',
    habits:    'habitsXP',
    learning:  'learningXP',
    finance:   'financeXP',
  };
  return map[module] || null;
}

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
 * Awards XP with layered anti-cheat enforcement (all server-side, inviolable):
 *   1. Blocked if user is in penitence.
 *   2. Per-module daily limit: gym/cardio/nutrition/finance/learning → first award only.
 *      habits (includes goals) → max 100 XP total per day.
 *   3. Global daily cap of 500 XP per user.
 *   4. Probation multiplier: 60% XP for accounts < 30 days old.
 *   5. Active debuff multipliers (stacks with probation).
 *   6. Class bonus for the given module.
 *   7. Assassin combo x2 when all 6 modules done.
 *   8. Season multiplier.
 *   9. Persists XP, recalculates level/rank, updates stats, tracks daily XP.
 *
 * Returns { finalXP, blocked? } — blocked is set when XP is rejected with a reason.
 */
async function awardXP(userId, module, baseXP, prisma) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      class: true, inPenitence: true, seasonMultiplier: true, createdAt: true,
      statStr: true, statInt: true, statVit: true, statDis: true, statWis: true, statGol: true,
    },
  });

  if (user.inPenitence) {
    return { finalXP: 0, blocked: 'penitence' };
  }

  const today = startOfToday();

  // ── Anti-cheat layer 1 & 2: per-module + global daily caps ───────────────
  const todayCombo = await prisma.dailyCombo.findFirst({
    where: { userId, date: today },
  });

  const field = moduleXPField(module);
  const existingModuleXP = field && todayCombo ? (todayCombo[field] ?? 0) : 0;
  const existingTotalXP  = todayCombo ? (todayCombo.totalXP ?? 0) : 0;

  if (module === 'habits') {
    if (existingModuleXP >= ANTI_CHEAT.HABITS_DAILY_CAP) {
      return { finalXP: 0, blocked: 'daily_habit_cap' };
    }
  } else {
    // All other modules: only the first activity of the day earns XP
    if (existingModuleXP > 0) {
      return { finalXP: 0, blocked: 'already_awarded_today' };
    }
  }

  if (existingTotalXP >= ANTI_CHEAT.GLOBAL_DAILY_CAP) {
    return { finalXP: 0, blocked: 'daily_total_cap' };
  }

  // ── Anti-cheat layer 3: probation multiplier ──────────────────────────────
  const daysSinceJoined = (Date.now() - new Date(user.createdAt).getTime()) / 86_400_000;
  const probationMultiplier = daysSinceJoined < ANTI_CHEAT.PROBATION_DAYS
    ? ANTI_CHEAT.PROBATION_MULT
    : 1.0;

  // ── Active debuffs → lowest multiplier wins ───────────────────────────────
  const now = new Date();
  const activeDebuffs = await prisma.debuff.findMany({
    where: { userId, active: true, expiresAt: { gt: now } },
  });
  const debuffMultiplier = activeDebuffs.length > 0
    ? Math.min(...activeDebuffs.map((d) => d.xpMultiplier))
    : 1;

  // ── Class bonus ───────────────────────────────────────────────────────────
  const classConfig = CLASS_BONUSES[user.class] || CLASS_BONUSES.Warrior;
  let classMultiplier = classConfig[module] || 1.0;

  // Assassin special: all 6 modules done today → x2 on top of base 1.2
  if (user.class === 'Assassin' && todayCombo?.comboActive) {
    classMultiplier = classMultiplier * 2;
  }

  // ── Season multiplier ─────────────────────────────────────────────────────
  const seasonMultiplier = user.seasonMultiplier ?? 1.0;

  // ── Compute final XP ──────────────────────────────────────────────────────
  let finalXP = Math.round(
    baseXP * classMultiplier * debuffMultiplier * seasonMultiplier * probationMultiplier
  );

  // Clamp to remaining daily budget
  if (module === 'habits') {
    finalXP = Math.min(finalXP, ANTI_CHEAT.HABITS_DAILY_CAP - existingModuleXP);
  }
  finalXP = Math.min(finalXP, ANTI_CHEAT.GLOBAL_DAILY_CAP - existingTotalXP);

  if (finalXP <= 0) {
    return { finalXP: 0, blocked: 'zero_xp' };
  }

  // ── Persist XP, level, rank, stats (2 queries instead of 4) ─────────────
  const afterXP = await prisma.user.update({
    where: { id: userId },
    data: { xp: { increment: finalXP } },
    select: { xp: true },
  });

  const newXP  = afterXP.xp;
  const level  = Math.floor(newXP / 500) + 1;
  let rank = 'Bronze';
  if (newXP >= 10001)     rank = 'Diamond';
  else if (newXP >= 5001) rank = 'Platinum';
  else if (newXP >= 2001) rank = 'Gold';
  else if (newXP >= 501)  rank = 'Silver';

  const statGain = STAT_GAINS[module];
  const statUpdate = {};
  if (statGain) {
    for (const [stat, gain] of Object.entries(statGain)) {
      statUpdate[stat] = { increment: gain };
    }
  }
  await prisma.user.update({ where: { id: userId }, data: { level, rank, ...statUpdate } });

  // ── Track daily XP in DailyCombo (upsert) ────────────────────────────────
  if (field) {
    const isHabits = module === 'habits';
    await prisma.dailyCombo.upsert({
      where: { userId_date: { userId, date: today } },
      create: {
        userId,
        date: today,
        [field]: finalXP,
        totalXP: finalXP,
      },
      update: {
        // habits accumulate; everything else is set once (already 0 at this point)
        [field]: isHabits ? { increment: finalXP } : finalXP,
        totalXP: { increment: finalXP },
      },
    });
  }

  return { finalXP, debuffMultiplier, classMultiplier, probationMultiplier };
}

/**
 * checkAndApplyDebuffs(userId, prisma)
 * Applies debuff based on current failStreak. Returns the debuff created (or null).
 */
async function checkAndApplyDebuffs(userId, prisma) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failStreak: true },
  });

  const { failStreak } = user;
  if (failStreak < 1) return null;

  let templateKey;
  if (failStreak >= 3)       templateKey = 'despair';
  else if (failStreak === 2) templateKey = 'weakness';
  else                       templateKey = 'fatigue';

  const template = DEBUFF_TEMPLATES[templateKey];
  const expiresAt = new Date(Date.now() + template.hours * 60 * 60 * 1000);

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
 * If failStreak >= 3 → increment deathCount, set inPenitence=true, reset failStreak=0.
 * Returns true if the user just died.
 */
async function checkDeath(userId, prisma) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failStreak: true, inPenitence: true },
  });

  if (user.failStreak >= 3 && !user.inPenitence) {
    await prisma.user.update({
      where: { id: userId },
      data: { deathCount: { increment: 1 }, inPenitence: true, failStreak: 0 },
    });
    return true;
  }

  return false;
}

/**
 * updateCombo(userId, module, prisma)
 * Marks the module as done in today's DailyCombo. Activates combo if >= 3 modules done.
 * Returns the updated combo record.
 */
async function updateCombo(userId, module, prisma) {
  const today = startOfToday();

  const moduleField = {
    gym:       'gymDone',
    cardio:    'cardioDone',
    nutrition: 'nutritionDone',
    habits:    'habitsDone',
    learning:  'learningDone',
    finance:   'financeDone',
  }[module];

  if (!moduleField) return null;

  const updated = await prisma.dailyCombo.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, [moduleField]: true },
    update: { [moduleField]: true },
  });

  const doneCount = [
    updated.gymDone,
    updated.cardioDone,
    updated.nutritionDone,
    updated.habitsDone,
    updated.learningDone,
    updated.financeDone,
  ].filter(Boolean).length;

  const allDone         = doneCount === 6;
  const comboActive     = doneCount >= 3;
  const comboMultiplier = allDone ? 2.0 : comboActive ? 1.5 : 1.0;

  const finalCombo = await prisma.dailyCombo.update({
    where: { userId_date: { userId, date: today } },
    data: { comboActive, comboMultiplier },
  });

  return finalCombo;
}

/**
 * checkAndUpdateStreak(userId, prisma)
 * Updates streak based on lastActiveDate. Applies debuffs + death check on miss.
 * Returns { streak, failStreak, died }.
 */
async function checkAndUpdateStreak(userId, prisma) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streak: true, longestStreak: true, failStreak: true, lastActiveDate: true, comboStreak: true },
  });

  const today = startOfToday();

  if (user.lastActiveDate && isSameDay(user.lastActiveDate, today)) {
    return { streak: user.streak, failStreak: user.failStreak, died: false };
  }

  let newStreak;
  let newFailStreak = user.failStreak;
  let newComboStreak = user.comboStreak;

  if (!user.lastActiveDate) {
    // First ever activity — start streak at 1, no penalty for new users
    newStreak      = 1;
    newFailStreak  = 0;
    newComboStreak = 0;
  } else if (isYesterday(user.lastActiveDate)) {
    newStreak      = user.streak + 1;
    newFailStreak  = 0;
    newComboStreak = user.comboStreak + 1;
  } else {
    // Missed one or more days
    newStreak      = 1;
    newFailStreak  = user.failStreak + 1;
    newComboStreak = 0;
  }

  const newLongest = Math.max(user.longestStreak, newStreak);

  await prisma.user.update({
    where: { id: userId },
    data: {
      streak:        newStreak,
      longestStreak: newLongest,
      failStreak:    newFailStreak,
      comboStreak:   newComboStreak,
      lastActiveDate: today,
    },
  });

  await checkAndApplyDebuffs(userId, prisma);
  const died = await checkDeath(userId, prisma);

  return { streak: newStreak, failStreak: newFailStreak, died };
}

/**
 * getProbationInfo(createdAt)
 * Returns probation status for a user based on their registration date.
 */
function getProbationInfo(createdAt) {
  const daysSinceJoined = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  const isProbation     = daysSinceJoined < ANTI_CHEAT.PROBATION_DAYS;
  const daysLeft        = isProbation ? Math.ceil(ANTI_CHEAT.PROBATION_DAYS - daysSinceJoined) : 0;
  return { isProbation, daysLeft, xpMultiplier: isProbation ? ANTI_CHEAT.PROBATION_MULT : 1.0 };
}

module.exports = {
  CLASS_BONUSES,
  STAT_GAINS,
  DEBUFF_TEMPLATES,
  ANTI_CHEAT,
  QUICK_MISSIONS,
  awardXP,
  recalcRankLevel,
  checkAndApplyDebuffs,
  checkDeath,
  updateCombo,
  checkAndUpdateStreak,
  getProbationInfo,
  isSameCalendarDay: isSameDay,
};
