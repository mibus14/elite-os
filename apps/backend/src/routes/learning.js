const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();

function startOfDay(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

async function addXPAndRecalc(userId, amount) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { xp: { increment: amount } },
    select: { xp: true },
  });
  const xp = user.xp;
  const level = Math.floor(xp / 500) + 1;
  let rank = 'Bronze';
  if (xp >= 10001) rank = 'Diamond';
  else if (xp >= 5001) rank = 'Platinum';
  else if (xp >= 2001) rank = 'Gold';
  else if (xp >= 501) rank = 'Silver';
  await prisma.user.update({ where: { id: userId }, data: { level, rank } });
}

// GET /api/learning/sessions
router.get('/sessions', authenticate, async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const sessions = await prisma.learningSession.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });
    const total = await prisma.learningSession.count({ where: { userId: req.user.id } });
    res.json({ sessions, total });
  } catch (err) {
    next(err);
  }
});

// POST /api/learning/sessions
router.post(
  '/sessions',
  authenticate,
  [
    body('subject').trim().notEmpty().withMessage('Subject required'),
    body('duration').isInt({ min: 1 }).withMessage('Duration in minutes required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { subject, language, duration, notes, date } = req.body;

      const durationMinutes = parseInt(duration);
      const xpEarned = Math.round((durationMinutes / 60) * 40);

      const session = await prisma.learningSession.create({
        data: {
          userId: req.user.id,
          date: date ? startOfDay(new Date(date)) : startOfDay(new Date()),
          subject,
          language: language || null,
          duration: durationMinutes,
          xpEarned,
          notes: notes || null,
        },
      });

      await addXPAndRecalc(req.user.id, xpEarned);
      res.status(201).json({ session, xpAwarded: xpEarned });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/learning/stats
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [totalAgg, weekAgg, subjects] = await Promise.all([
      prisma.learningSession.aggregate({
        where: { userId },
        _sum: { duration: true, xpEarned: true },
        _count: true,
      }),
      prisma.learningSession.aggregate({
        where: {
          userId,
          date: {
            gte: (() => {
              const d = new Date();
              d.setDate(d.getDate() - 6);
              d.setHours(0, 0, 0, 0);
              return d;
            })(),
          },
        },
        _sum: { duration: true, xpEarned: true },
        _count: true,
      }),
      prisma.learningSession.groupBy({
        by: ['subject'],
        where: { userId },
        _sum: { duration: true },
        _count: { subject: true },
        orderBy: { _sum: { duration: 'desc' } },
      }),
    ]);

    res.json({
      total: {
        sessions: totalAgg._count,
        totalMinutes: totalAgg._sum.duration || 0,
        totalHours: parseFloat(((totalAgg._sum.duration || 0) / 60).toFixed(1)),
        totalXP: totalAgg._sum.xpEarned || 0,
      },
      thisWeek: {
        sessions: weekAgg._count,
        totalMinutes: weekAgg._sum.duration || 0,
        totalXP: weekAgg._sum.xpEarned || 0,
      },
      subjects: subjects.map((s) => ({
        subject: s.subject,
        sessions: s._count.subject,
        totalMinutes: s._sum.duration || 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
