const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');
const rpg = require('../lib/rpg');

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
            learningItems: true,
          },
        },
      },
    });

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const userIds = users.map((u) => u.id);

    const [weeklyComboRows, weeklyGymRows, weeklyCardioRows] = await Promise.all([
      prisma.dailyCombo.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, date: { gte: weekStart } },
        _sum: { totalXP: true },
      }),
      prisma.gymSession.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, date: { gte: weekStart } },
        _count: { _all: true },
      }),
      prisma.cardioSession.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, date: { gte: weekStart } },
        _count: { _all: true },
      }),
    ]);

    const weeklyXPMap      = Object.fromEntries(weeklyComboRows.map((r) => [r.userId, r._sum.totalXP ?? 0]));
    const weeklyGymMap     = Object.fromEntries(weeklyGymRows.map((r) => [r.userId, r._count._all]));
    const weeklyCardioMap  = Object.fromEntries(weeklyCardioRows.map((r) => [r.userId, r._count._all]));

    const enriched = users.map((user, index) => {
      const probation = rpg.getProbationInfo(user.createdAt);
      return {
        ...user,
        position: index + 1,
        weeklyXP: weeklyXPMap[user.id] ?? 0,
        weeklySessions: (weeklyGymMap[user.id] ?? 0) + (weeklyCardioMap[user.id] ?? 0),
        isCurrentUser: user.id === req.user.id,
        isProbation:   probation.isProbation,
        probationDaysLeft: probation.daysLeft,
      };
    });

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

    const allIds = users.map((u) => u.id);

    const [gymRows, cardioRows, volumeRows, learningRows, goalRows, habitRows] = await Promise.all([
      prisma.gymSession.groupBy({ by: ['userId'], where: { userId: { in: allIds } }, _count: { _all: true } }),
      prisma.cardioSession.groupBy({ by: ['userId'], where: { userId: { in: allIds } }, _count: { _all: true } }),
      prisma.gymSession.groupBy({ by: ['userId'], where: { userId: { in: allIds } }, _sum: { totalVolume: true } }),
      prisma.learningItem.groupBy({ by: ['userId'], where: { userId: { in: allIds }, completed: true }, _count: { _all: true } }),
      prisma.goal.groupBy({ by: ['userId'], where: { userId: { in: allIds }, status: 'completed' }, _count: { _all: true } }),
      prisma.habitLog.groupBy({ by: ['userId'], where: { userId: { in: allIds }, completed: true }, _count: { _all: true } }),
    ]);

    const gymMap      = Object.fromEntries(gymRows.map((r) => [r.userId, r._count._all]));
    const cardioMap   = Object.fromEntries(cardioRows.map((r) => [r.userId, r._count._all]));
    const volumeMap   = Object.fromEntries(volumeRows.map((r) => [r.userId, r._sum.totalVolume ?? 0]));
    const learningMap = Object.fromEntries(learningRows.map((r) => [r.userId, r._count._all]));
    const goalMap     = Object.fromEntries(goalRows.map((r) => [r.userId, r._count._all]));
    const habitMap    = Object.fromEntries(habitRows.map((r) => [r.userId, r._count._all]));

    const stats = users.map((user) => ({
      user,
      gymSessions:        gymMap[user.id]      ?? 0,
      cardioSessions:     cardioMap[user.id]   ?? 0,
      totalVolumeLifted:  volumeMap[user.id]   ?? 0,
      totalLearningItems: learningMap[user.id] ?? 0,
      goalsCompleted:     goalMap[user.id]     ?? 0,
      habitsCompleted:    habitMap[user.id]    ?? 0,
    }));

    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

// GET /api/leaderboard/users/:id/profile — public profile of another user
router.get('/users/:id/profile', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
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
        deathCount: true,
        comboStreak: true,
        equippedFrame: true,
        equippedTitle: true,
        equippedBg: true,
        inventory: { select: { itemSlug: true, purchasedAt: true } },
        _count: {
          select: {
            gymSessions: true,
            cardioSessions: true,
            learningItems: true,
            goals: true,
          },
        },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const [goalsCompleted, habitsCompleted] = await Promise.all([
      prisma.goal.count({ where: { userId: user.id, status: 'completed' } }),
      prisma.habitLog.count({ where: { userId: user.id, completed: true } }),
    ]);

    res.json({
      profile: {
        ...user,
        goalsCompleted,
        habitsCompleted,
        gymSessions:   user._count.gymSessions,
        cardioSessions:user._count.cardioSessions,
        learningItems: user._count.learningItems,
        isCurrentUser: user.id === req.user.id,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
