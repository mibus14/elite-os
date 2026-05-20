const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/leaderboard
router.get('/', authenticate, async (req, res, next) => {
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
        longestStreak: true,
        createdAt: true,
        _count: {
          select: {
            gymSessions: true,
            cardioSessions: true,
            habitLogs: true,
            learningSessions: true,
          },
        },
      },
    });

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const enriched = await Promise.all(
      users.map(async (user, index) => {
        const [weeklyGym, weeklyCardio, weeklyHabits, weeklyLearning] = await Promise.all([
          prisma.gymSession.count({ where: { userId: user.id, date: { gte: weekStart } } }),
          prisma.cardioSession.count({ where: { userId: user.id, date: { gte: weekStart } } }),
          prisma.habitLog.count({ where: { userId: user.id, date: { gte: weekStart }, completed: true } }),
          prisma.learningSession.findMany({
            where: { userId: user.id, date: { gte: weekStart } },
            select: { xpEarned: true },
          }),
        ]);

        const weeklyXP =
          weeklyGym * 50 +
          weeklyCardio * 30 +
          weeklyHabits * 10 +
          weeklyLearning.reduce((s, l) => s + l.xpEarned, 0);

        return {
          ...user,
          position: index + 1,
          weeklyXP,
          weeklySessions: weeklyGym + weeklyCardio,
          isCurrentUser: user.id === req.user.id,
        };
      })
    );

    res.json({ leaderboard: enriched });
  } catch (err) {
    next(err);
  }
});

// GET /api/leaderboard/stats
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, avatar: true, rank: true, level: true, xp: true },
    });

    const stats = await Promise.all(
      users.map(async (user) => {
        const [gymCount, cardioCount, gymVolume, totalLearning, goalsCompleted, habitsCompleted] =
          await Promise.all([
            prisma.gymSession.count({ where: { userId: user.id } }),
            prisma.cardioSession.count({ where: { userId: user.id } }),
            prisma.gymSession.aggregate({
              where: { userId: user.id },
              _sum: { totalVolume: true },
            }),
            prisma.learningSession.aggregate({
              where: { userId: user.id },
              _sum: { duration: true },
            }),
            prisma.goal.count({ where: { userId: user.id, status: 'completed' } }),
            prisma.habitLog.count({ where: { userId: user.id, completed: true } }),
          ]);

        return {
          user,
          gymSessions: gymCount,
          cardioSessions: cardioCount,
          totalVolumeLifted: gymVolume._sum.totalVolume || 0,
          totalLearningMinutes: totalLearning._sum.duration || 0,
          goalsCompleted,
          habitsCompleted,
        };
      })
    );

    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
