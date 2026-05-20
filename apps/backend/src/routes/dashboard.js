const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();

function startOfDay(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function addDays(d, n) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
}

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = startOfDay(new Date());
    const weekStart = startOfDay(addDays(today, -6));
    const sevenDaysAgo = startOfDay(addDays(today, -6));

    // ── Today's habits ────────────────────────────────────────────────────────
    const [totalHabits, completedHabitsToday] = await Promise.all([
      prisma.habit.count({ where: { userId } }),
      prisma.habitLog.count({
        where: { userId, date: today, completed: true },
      }),
    ]);

    // ── Weekly XP (estimate from activity this week) ──────────────────────────
    const [gymThisWeek, cardioThisWeek, habitLogsThisWeek, learningThisWeek] = await Promise.all([
      prisma.gymSession.count({ where: { userId, date: { gte: weekStart } } }),
      prisma.cardioSession.count({ where: { userId, date: { gte: weekStart } } }),
      prisma.habitLog.count({ where: { userId, date: { gte: weekStart }, completed: true } }),
      prisma.learningSession.findMany({ where: { userId, date: { gte: weekStart } }, select: { xpEarned: true } }),
    ]);

    const weeklyXP =
      gymThisWeek * 50 +
      cardioThisWeek * 30 +
      habitLogsThisWeek * 10 +
      learningThisWeek.reduce((sum, s) => sum + s.xpEarned, 0);

    // ── Calories today ────────────────────────────────────────────────────────
    const todayMeals = await prisma.meal.aggregate({
      where: { userId, date: today },
      _sum: { calories: true },
    });

    // ── Sleep average (7 days) ────────────────────────────────────────────────
    const sleepLogs = await prisma.dailyLog.findMany({
      where: { userId, date: { gte: sevenDaysAgo } },
      select: { sleepHours: true },
    });
    const avgSleep =
      sleepLogs.length > 0
        ? sleepLogs.reduce((s, l) => s + l.sleepHours, 0) / sleepLogs.length
        : 0;

    // ── Recent activity feed (last 10 events) ─────────────────────────────────
    const [recentGym, recentCardio, recentLearning] = await Promise.all([
      prisma.gymSession.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 5,
        select: { id: true, name: true, date: true, duration: true, totalVolume: true },
      }),
      prisma.cardioSession.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 5,
        select: { id: true, type: true, date: true, duration: true, distance: true, calories: true },
      }),
      prisma.learningSession.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 5,
        select: { id: true, subject: true, date: true, duration: true, xpEarned: true },
      }),
    ]);

    const activityFeed = [
      ...recentGym.map((s) => ({ type: 'gym', ...s, label: `Gym: ${s.name}`, xp: 50 })),
      ...recentCardio.map((s) => ({ type: 'cardio', ...s, label: `Cardio: ${s.type}`, xp: 30 })),
      ...recentLearning.map((s) => ({ type: 'learning', ...s, label: `Study: ${s.subject}`, xp: s.xpEarned })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    // ── Weekly heatmap (last 52 weeks) ────────────────────────────────────────
    const heatmapStart = startOfDay(addDays(today, -364));
    const [heatmapHabits, heatmapGym, heatmapCardio] = await Promise.all([
      prisma.habitLog.findMany({
        where: { userId, date: { gte: heatmapStart }, completed: true },
        select: { date: true },
      }),
      prisma.gymSession.findMany({
        where: { userId, date: { gte: heatmapStart } },
        select: { date: true },
      }),
      prisma.cardioSession.findMany({
        where: { userId, date: { gte: heatmapStart } },
        select: { date: true },
      }),
    ]);

    const heatmapMap = {};
    const addToHeatmap = (items, weight) => {
      for (const item of items) {
        const key = new Date(item.date).toISOString().slice(0, 10);
        heatmapMap[key] = (heatmapMap[key] || 0) + weight;
      }
    };
    addToHeatmap(heatmapHabits, 1);
    addToHeatmap(heatmapGym, 3);
    addToHeatmap(heatmapCardio, 2);

    const weeklyHeatmap = Object.entries(heatmapMap).map(([date, count]) => ({ date, count }));

    res.json({
      habits: {
        total: totalHabits,
        completedToday: completedHabitsToday,
        percentage: totalHabits > 0 ? Math.round((completedHabitsToday / totalHabits) * 100) : 0,
      },
      streak: req.user.streak,
      longestStreak: req.user.longestStreak,
      weeklyXP,
      totalXP: req.user.xp,
      level: req.user.level,
      rank: req.user.rank,
      sessionsThisWeek: gymThisWeek + cardioThisWeek,
      gymSessionsThisWeek: gymThisWeek,
      cardioSessionsThisWeek: cardioThisWeek,
      caloriesToday: todayMeals._sum.calories || 0,
      avgSleep: parseFloat(avgSleep.toFixed(1)),
      activityFeed,
      weeklyHeatmap,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
