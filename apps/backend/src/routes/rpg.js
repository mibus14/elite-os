const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');
const rpg = require('../lib/rpg');

const prisma = new PrismaClient();

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── GET /api/rpg/character ───────────────────────────────────────────────────
// Full RPG profile: class, all stats, active debuffs, today's combo, rank, level.
router.get('/character', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const today = startOfToday();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatar: true,
        level: true,
        xp: true,
        rank: true,
        streak: true,
        longestStreak: true,
        class: true,
        statStr: true,
        statInt: true,
        statVit: true,
        statDis: true,
        statWis: true,
        statGol: true,
        failStreak: true,
        inPenitence: true,
        comboStreak: true,
        deathCount: true,
        lastActiveDate: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const [activeDebuffs, todayCombo] = await Promise.all([
      prisma.debuff.findMany({
        where: { userId, active: true, expiresAt: { gt: now } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dailyCombo.findUnique({
        where: { userId_date: { userId, date: today } },
      }),
    ]);

    res.json({
      character: {
        ...user,
        stats: {
          STR: user.statStr,
          INT: user.statInt,
          VIT: user.statVit,
          DIS: user.statDis,
          WIS: user.statWis,
          GOL: user.statGol,
        },
        activeDebuffs,
        todayCombo: todayCombo || null,
        classConfig: rpg.CLASS_BONUSES[user.class] || rpg.CLASS_BONUSES.Warrior,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/rpg/class ──────────────────────────────────────────────────────
// Set class — only allowed on first selection (class === 'Warrior' && deathCount === 0).
router.post(
  '/class',
  authenticate,
  [
    body('class')
      .isIn(['Warrior', 'Monk', 'Sage', 'Assassin', 'Merchant'])
      .withMessage('Invalid class. Choose: Warrior, Monk, Sage, Assassin, Merchant'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { class: true, deathCount: true },
      });

      if (!user) return res.status(404).json({ error: 'User not found' });

      // Only allow first-time selection
      if (user.class !== 'Warrior' || user.deathCount !== 0) {
        return res.status(403).json({
          error: 'Class already chosen. You can only select your class once at the beginning.',
        });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { class: req.body.class },
        select: { class: true, id: true, username: true },
      });

      res.json({
        message: `Class set to ${updated.class}`,
        class: updated.class,
        bonuses: rpg.CLASS_BONUSES[updated.class],
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/rpg/combo ───────────────────────────────────────────────────────
// Today's DailyCombo record for the authenticated user.
router.get('/combo', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = startOfToday();

    const combo = await prisma.dailyCombo.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    res.json({
      combo: combo || {
        gymDone: false,
        cardioDone: false,
        nutritionDone: false,
        habitsDone: false,
        learningDone: false,
        financeDone: false,
        comboActive: false,
        comboMultiplier: 1.0,
      },
      date: today.toISOString().slice(0, 10),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/rpg/debuffs ─────────────────────────────────────────────────────
// Active debuffs that have not yet expired.
router.get('/debuffs', authenticate, async (req, res, next) => {
  try {
    const now = new Date();
    const debuffs = await prisma.debuff.findMany({
      where: {
        userId: req.user.id,
        active: true,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ debuffs });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/rpg/penitence ──────────────────────────────────────────────────
// Complete penitence task. Requires { task: "completed" }.
// Clears inPenitence, resets failStreak to 0, awards 50 XP.
router.post(
  '/penitence',
  authenticate,
  [body('task').equals('completed').withMessage('task must be "completed"')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { inPenitence: true },
      });

      if (!user) return res.status(404).json({ error: 'User not found' });

      if (!user.inPenitence) {
        return res.status(400).json({ error: 'You are not in penitence.' });
      }

      // Clear penitence and failStreak
      await prisma.user.update({
        where: { id: userId },
        data: { inPenitence: false, failStreak: 0 },
      });

      // Deactivate all active debuffs
      await prisma.debuff.updateMany({
        where: { userId, active: true },
        data: { active: false },
      });

      // Award flat 50 XP (bypass RPG multipliers — this is a resurrection bonus)
      await prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: 50 } },
      });

      // Recalc level/rank manually (can't use awardXP as user was in penitence)
      const fresh = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
      const xp = fresh.xp;
      const level = Math.floor(xp / 500) + 1;
      let rank = 'Bronze';
      if (xp >= 10001)      rank = 'Diamond';
      else if (xp >= 5001)  rank = 'Platinum';
      else if (xp >= 2001)  rank = 'Gold';
      else if (xp >= 501)   rank = 'Silver';
      await prisma.user.update({ where: { id: userId }, data: { level, rank } });

      res.json({
        message: 'Penitence completed. You have been reborn.',
        xpAwarded: 50,
        inPenitence: false,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/rpg/missions ────────────────────────────────────────────────────
// Generates 3 daily missions based on user class and today's activity.
router.get('/missions', authenticate, async (req, res, next) => {
  try {
    const today = startOfToday();

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        debuffs: { where: { active: true, expiresAt: { gt: new Date() } } },
        dailyCombos: { where: { date: today } }
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const combo = user.dailyCombos[0];
    const missions = [];

    // Mission 1: Activate today's combo
    const modulesDone = [
      combo?.gymDone, combo?.nutritionDone, combo?.habitsDone,
      combo?.cardioDone, combo?.learningDone, combo?.financeDone
    ].filter(Boolean).length;
    const modulesLeft = Math.max(0, 3 - modulesDone);

    missions.push({
      id: 'combo',
      title: modulesLeft <= 0 ? '¡Combo activado!' : 'Activa el combo del día',
      description: modulesLeft <= 0
        ? 'Ya activaste el combo. Sigue así.'
        : `Completa ${modulesLeft} módulo${modulesLeft > 1 ? 's' : ''} más para x1.5 XP`,
      xpReward: 50,
      completed: modulesDone >= 3,
      icon: '🔥',
      type: 'combo'
    });

    // Mission 2: Class-specific mission
    const classMissions = {
      Warrior:  { title: 'Entrena hoy',        description: 'Registra 1 sesión de gym',                   icon: '⚔️',  xpReward: 75,  module: 'gym',    done: combo?.gymDone },
      Monk:     { title: 'Disciplina total',    description: 'Completa todos tus hábitos de hoy',           icon: '🧘',  xpReward: 75,  module: 'habits', done: combo?.habitsDone },
      Sage:     { title: 'Sesión de estudio',   description: 'Estudia al menos 30 minutos hoy',             icon: '📚',  xpReward: 75,  module: 'learning', done: combo?.learningDone },
      Assassin: { title: 'Dominio total',       description: 'Completa los 6 módulos hoy para x2 XP',      icon: '🗡️', xpReward: 200, module: 'all',    done: combo?.comboMultiplier >= 2 },
      Merchant: { title: 'Control financiero',  description: 'Registra al menos 1 transacción hoy',         icon: '💰',  xpReward: 75,  module: 'finance', done: combo?.financeDone },
    };

    const cm = classMissions[user.class] || classMissions.Warrior;
    missions.push({ id: 'class', ...cm, completed: !!cm.done, type: 'class' });

    // Mission 3: Streak mission
    const activeToday = user.lastActiveDate &&
      new Date(user.lastActiveDate).toDateString() === new Date().toDateString();

    missions.push({
      id: 'streak',
      title: user.streak >= 7 ? `Racha de ${user.streak} días` : 'Mantén tu racha',
      description: user.streak >= 7
        ? '¡Eres imparable! Sigue así.'
        : 'Activa cualquier módulo para no romper tu racha',
      xpReward: user.streak * 10,
      completed: !!activeToday,
      icon: '🔥',
      type: 'streak'
    });

    res.json({ missions, date: new Date().toISOString().slice(0, 10) });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/rpg/leaderboard ─────────────────────────────────────────────────
// All users sorted by XP, including class and stats.
router.get('/leaderboard', authenticate, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { xp: 'desc' },
      select: {
        id: true,
        username: true,
        avatar: true,
        level: true,
        xp: true,
        rank: true,
        streak: true,
        class: true,
        statStr: true,
        statInt: true,
        statVit: true,
        statDis: true,
        statWis: true,
        statGol: true,
        comboStreak: true,
        deathCount: true,
      },
    });

    const leaderboard = users.map((user, index) => ({
      ...user,
      position: index + 1,
      isCurrentUser: user.id === req.user.id,
      stats: {
        STR: user.statStr,
        INT: user.statInt,
        VIT: user.statVit,
        DIS: user.statDis,
        WIS: user.statWis,
        GOL: user.statGol,
      },
    }));

    res.json({ leaderboard });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
