const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');
const rpg = require('../lib/rpg');

const prisma = new PrismaClient();

function startOfDay(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

// GET /api/gym/sessions
router.get('/sessions', authenticate, async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const sessions = await prisma.gymSession.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        sessionExercises: {
          include: { exercise: true },
        },
      },
    });
    const total = await prisma.gymSession.count({ where: { userId: req.user.id } });
    res.json({ sessions, total });
  } catch (err) {
    next(err);
  }
});

// GET /api/gym/sessions/:id
router.get('/sessions/:id', authenticate, async (req, res, next) => {
  try {
    const session = await prisma.gymSession.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        sessionExercises: {
          include: { exercise: true },
        },
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ session });
  } catch (err) {
    next(err);
  }
});

// POST /api/gym/sessions
router.post(
  '/sessions',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Session name required'),
    body('duration').isInt({ min: 1 }).withMessage('Duration in minutes required'),
    body('date').optional().isISO8601(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, date, duration, notes, exercises } = req.body;

      let totalVolume = 0;
      if (exercises && Array.isArray(exercises)) {
        for (const ex of exercises) {
          if (ex.sets && Array.isArray(ex.sets)) {
            for (const set of ex.sets) {
              totalVolume += (set.weight || 0) * (set.reps || 0);
            }
          }
        }
      }

      const session = await prisma.gymSession.create({
        data: {
          userId: req.user.id,
          name,
          date: date ? startOfDay(new Date(date)) : startOfDay(new Date()),
          duration: parseInt(duration),
          notes: notes || null,
          totalVolume,
          sessionExercises: exercises && Array.isArray(exercises)
            ? {
                create: exercises.map((ex) => ({
                  exerciseId: ex.exerciseId,
                  sets: ex.sets || [],
                })),
              }
            : undefined,
        },
        include: {
          sessionExercises: { include: { exercise: true } },
        },
      });

      // Anti-cheat: solo dar XP si la sesión se registra para hoy
      const activityDate = date ? startOfDay(new Date(date)) : startOfDay(new Date());
      const isToday = activityDate.getTime() === startOfDay(new Date()).getTime();
      let xpAwarded = 0;
      if (isToday) {
        const { finalXP } = await rpg.awardXP(req.user.id, 'gym', 50, prisma);
        xpAwarded = finalXP;
        await rpg.updateCombo(req.user.id, 'gym', prisma);
        await rpg.checkAndUpdateStreak(req.user.id, prisma);
      }
      res.status(201).json({ session, xpAwarded });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/gym/sessions/:id
router.put('/sessions/:id', authenticate, async (req, res, next) => {
  try {
    const existing = await prisma.gymSession.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ error: 'Session not found' });

    const { name, date, duration, notes, exercises } = req.body;

    let totalVolume = existing.totalVolume;
    if (exercises && Array.isArray(exercises)) {
      totalVolume = 0;
      for (const ex of exercises) {
        if (ex.sets && Array.isArray(ex.sets)) {
          for (const set of ex.sets) {
            totalVolume += (set.weight || 0) * (set.reps || 0);
          }
        }
      }

      await prisma.sessionExercise.deleteMany({ where: { sessionId: req.params.id } });
      await prisma.sessionExercise.createMany({
        data: exercises.map((ex) => ({
          sessionId: req.params.id,
          exerciseId: ex.exerciseId,
          sets: ex.sets || [],
        })),
      });
    }

    const session = await prisma.gymSession.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(date !== undefined && { date: startOfDay(new Date(date)) }),
        ...(duration !== undefined && { duration: parseInt(duration) }),
        ...(notes !== undefined && { notes }),
        totalVolume,
      },
      include: { sessionExercises: { include: { exercise: true } } },
    });

    res.json({ session });
  } catch (err) {
    next(err);
  }
});

// GET /api/gym/exercises
router.get('/exercises', authenticate, async (req, res, next) => {
  try {
    const exercises = await prisma.exercise.findMany({
      where: { userId: req.user.id },
      orderBy: { name: 'asc' },
    });
    res.json({ exercises });
  } catch (err) {
    next(err);
  }
});

// POST /api/gym/exercises
router.post(
  '/exercises',
  authenticate,
  [body('name').trim().notEmpty().withMessage('Exercise name required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, muscleGroups, equipment } = req.body;

      const exercise = await prisma.exercise.create({
        data: {
          userId: req.user.id,
          name,
          muscleGroups: muscleGroups || [],
          equipment: equipment || null,
        },
      });
      res.status(201).json({ exercise });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/gym/records
router.get('/records', authenticate, async (req, res, next) => {
  try {
    const records = await prisma.personalRecord.findMany({
      where: { userId: req.user.id },
      include: { exercise: true },
      orderBy: { date: 'desc' },
    });
    res.json({ records });
  } catch (err) {
    next(err);
  }
});

// POST /api/gym/records
router.post(
  '/records',
  authenticate,
  [
    body('exerciseId').notEmpty(),
    body('weight').isFloat({ min: 0 }),
    body('reps').isInt({ min: 1 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { exerciseId, weight, reps, date } = req.body;

      const exercise = await prisma.exercise.findFirst({
        where: { id: exerciseId, userId: req.user.id },
      });
      if (!exercise) return res.status(404).json({ error: 'Exercise not found' });

      const record = await prisma.personalRecord.create({
        data: {
          userId: req.user.id,
          exerciseId,
          weight: parseFloat(weight),
          reps: parseInt(reps),
          date: date ? startOfDay(new Date(date)) : startOfDay(new Date()),
        },
        include: { exercise: true },
      });

      res.status(201).json({ record });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/gym/stats
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    // Volume per week (last 12 weeks)
    const twelveWeeksAgo = new Date(now);
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 83);
    twelveWeeksAgo.setHours(0, 0, 0, 0);

    const sessions = await prisma.gymSession.findMany({
      where: { userId, date: { gte: twelveWeeksAgo } },
      orderBy: { date: 'asc' },
      select: { date: true, totalVolume: true, name: true, duration: true },
    });

    // Aggregate by week
    const weeklyVolume = {};
    for (const s of sessions) {
      const d = new Date(s.date);
      const weekKey = `${d.getFullYear()}-W${String(Math.ceil((d.getDate() + d.getDay()) / 7)).padStart(2, '0')}`;
      if (!weeklyVolume[weekKey]) weeklyVolume[weekKey] = { week: weekKey, volume: 0, sessions: 0 };
      weeklyVolume[weekKey].volume += s.totalVolume;
      weeklyVolume[weekKey].sessions += 1;
    }

    // Most used exercises (via sessionExercises) — single grouped query + one bulk fetch
    const allSessionIds = await prisma.gymSession.findMany({
      where: { userId },
      select: { id: true },
    });
    const ids = allSessionIds.map((s) => s.id);

    const exerciseUsage = await prisma.sessionExercise.groupBy({
      by: ['exerciseId'],
      where: { sessionId: { in: ids } },
      _count: { exerciseId: true },
      orderBy: { _count: { exerciseId: 'desc' } },
      take: 10,
    });

    const exerciseIds = exerciseUsage.map((e) => e.exerciseId);
    const exercises = await prisma.exercise.findMany({ where: { id: { in: exerciseIds } } });
    const exerciseMap = Object.fromEntries(exercises.map((e) => [e.id, e]));
    const exerciseDetails = exerciseUsage
      .map((e) => ({ exercise: exerciseMap[e.exerciseId] ?? null, count: e._count.exerciseId }))
      .filter((e) => e.exercise);

    // This week summary
    const thisWeekSessions = await prisma.gymSession.aggregate({
      where: { userId, date: { gte: weekStart } },
      _count: true,
      _sum: { totalVolume: true, duration: true },
    });

    res.json({
      thisWeek: {
        sessions: thisWeekSessions._count,
        totalVolume: thisWeekSessions._sum.totalVolume || 0,
        totalDuration: thisWeekSessions._sum.duration || 0,
      },
      weeklyVolume: Object.values(weeklyVolume),
      mostUsedExercises: exerciseDetails.filter((e) => e.exercise),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
