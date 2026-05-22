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

// GET /api/cardio/sessions
router.get('/sessions', authenticate, async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const sessions = await prisma.cardioSession.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });
    const total = await prisma.cardioSession.count({ where: { userId: req.user.id } });
    res.json({ sessions, total });
  } catch (err) {
    next(err);
  }
});

// POST /api/cardio/sessions
router.post(
  '/sessions',
  authenticate,
  [
    body('type').trim().notEmpty().withMessage('Type required'),
    body('duration').isInt({ min: 1 }).withMessage('Duration required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { type, duration, distance, calories, avgHeartRate, notes, date } = req.body;

      const session = await prisma.cardioSession.create({
        data: {
          userId: req.user.id,
          date: date ? startOfDay(new Date(date)) : startOfDay(new Date()),
          type,
          duration: parseInt(duration),
          distance: distance !== undefined ? parseFloat(distance) : null,
          calories: calories !== undefined ? parseInt(calories) : null,
          avgHeartRate: avgHeartRate !== undefined ? parseInt(avgHeartRate) : null,
          notes: notes || null,
        },
      });

      const activityDate = date ? startOfDay(new Date(date)) : startOfDay(new Date());
      const isToday = activityDate.getTime() === startOfDay(new Date()).getTime();
      let xpAwarded = 0;
      if (isToday) {
        const { finalXP } = await rpg.awardXP(req.user.id, 'cardio', 40, prisma);
        xpAwarded = finalXP;
        await rpg.updateCombo(req.user.id, 'cardio', prisma);
      }
      res.status(201).json({ session, xpAwarded });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/cardio/sessions/:id
router.delete('/sessions/:id', authenticate, async (req, res, next) => {
  try {
    const session = await prisma.cardioSession.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    await prisma.cardioSession.delete({ where: { id: req.params.id } });
    res.json({ message: 'Session deleted' });
  } catch (err) {
    next(err);
  }
});

// GET /api/cardio/stats
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const thisWeek = await prisma.cardioSession.aggregate({
      where: { userId, date: { gte: weekStart } },
      _count: true,
      _sum: { duration: true, distance: true, calories: true },
    });

    const allTime = await prisma.cardioSession.aggregate({
      where: { userId },
      _count: true,
      _sum: { duration: true, distance: true, calories: true },
    });

    // Last 30 days by type
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const byType = await prisma.cardioSession.groupBy({
      by: ['type'],
      where: { userId, date: { gte: thirtyDaysAgo } },
      _count: { type: true },
      _sum: { duration: true, distance: true },
    });

    res.json({
      thisWeek: {
        sessions: thisWeek._count,
        totalMinutes: thisWeek._sum.duration || 0,
        totalDistance: thisWeek._sum.distance || 0,
        totalCalories: thisWeek._sum.calories || 0,
      },
      allTime: {
        sessions: allTime._count,
        totalMinutes: allTime._sum.duration || 0,
        totalDistance: allTime._sum.distance || 0,
        totalCalories: allTime._sum.calories || 0,
      },
      byType: byType.map((t) => ({
        type: t.type,
        count: t._count.type,
        totalMinutes: t._sum.duration || 0,
        totalDistance: t._sum.distance || 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
