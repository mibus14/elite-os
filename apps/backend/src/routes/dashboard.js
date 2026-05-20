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

    // ── Yesterday XP estimate ─────────────────────────────────────────────
    const yesterday = startOfDay(addDays(today, -1));
    const [gymYesterday, cardioYesterday, habitYesterday, learningYesterday] = await Promise.all([
      prisma.gymSession.count({ where: { userId, date: yesterday } }),
      prisma.cardioSession.count({ where: { userId, date: yesterday } }),
      prisma.habitLog.count({ where: { userId, date: yesterday, completed: true } }),
      prisma.learningSession.findMany({ where: { userId, date: yesterday }, select: { xpEarned: true } }),
    ]);
    const yesterdayXP =
      gymYesterday * 50 + cardioYesterday * 30 + habitYesterday * 10 +
      learningYesterday.reduce((s, l) => s + l.xpEarned, 0);

    // ── Today XP ──────────────────────────────────────────────────────────
    const [gymToday, cardioToday, habitToday, learningToday] = await Promise.all([
      prisma.gymSession.count({ where: { userId, date: today } }),
      prisma.cardioSession.count({ where: { userId, date: today } }),
      prisma.habitLog.count({ where: { userId, date: today, completed: true } }),
      prisma.learningSession.findMany({ where: { userId, date: today }, select: { xpEarned: true } }),
    ]);
    const todayXP =
      gymToday * 50 + cardioToday * 30 + habitToday * 10 +
      learningToday.reduce((s, l) => s + l.xpEarned, 0);

    // ── Macros today ──────────────────────────────────────────────────────
    const macroAgg = await prisma.meal.aggregate({
      where: { userId, date: today },
      _sum: { calories: true, protein: true, carbs: true, fat: true },
    });

    // ── Top goals ─────────────────────────────────────────────────────────
    const topGoals = await prisma.goal.findMany({
      where: { userId, status: 'active' },
      orderBy: { updatedAt: 'desc' },
      take: 3,
    });

    // ── Radar data (activity ratios) ──────────────────────────────────────
    const [totalGym, totalCardio, totalLearning, totalGoalsCompleted] = await Promise.all([
      prisma.gymSession.count({ where: { userId } }),
      prisma.cardioSession.count({ where: { userId } }),
      prisma.learningSession.count({ where: { userId } }),
      prisma.goal.count({ where: { userId, status: 'completed' } }),
    ]);
    const radarData = [
      { subject: 'Gym',       value: Math.min(100, totalGym * 3),             fullMark: 100 },
      { subject: 'Nutrition', value: Math.min(100, (todayMeals._sum.calories || 0) > 0 ? 80 : 10), fullMark: 100 },
      { subject: 'Cardio',    value: Math.min(100, totalCardio * 4),          fullMark: 100 },
      { subject: 'Learning',  value: Math.min(100, totalLearning * 8),        fullMark: 100 },
      { subject: 'Habits',    value: totalHabits > 0 ? Math.round((completedHabitsToday / totalHabits) * 100) : 0, fullMark: 100 },
      { subject: 'Goals',     value: Math.min(100, totalGoalsCompleted * 12), fullMark: 100 },
    ];

    // ── Weekly XP per day ─────────────────────────────────────────────────
    const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const weeklyXPPerDay = await Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const day = startOfDay(addDays(today, -(6 - i)));
        const [g, c, h, l] = await Promise.all([
          prisma.gymSession.count({ where: { userId, date: day } }),
          prisma.cardioSession.count({ where: { userId, date: day } }),
          prisma.habitLog.count({ where: { userId, date: day, completed: true } }),
          prisma.learningSession.findMany({ where: { userId, date: day }, select: { xpEarned: true } }),
        ]);
        return {
          day: DAYS[day.getDay()],
          xp: g * 50 + c * 30 + h * 10 + l.reduce((s, x) => s + x.xpEarned, 0),
        };
      })
    );

    // ── Water today ───────────────────────────────────────────────────────
    const dailyLogToday = await prisma.dailyLog.findUnique({ where: { userId_date: { userId, date: today } } });

    // ── Format activity feed ──────────────────────────────────────────────
    const formattedFeed = activityFeed.map((a) => ({
      id:          a.id,
      type:        a.type,
      description: a.label,
      timestamp:   a.date,
      xpGained:    a.xp,
    }));

    res.json({
      todayXP,
      yesterdayXP,
      currentStreak:    req.user.streak,
      longestStreak:    req.user.longestStreak,
      weeklyXP:         weeklyXPPerDay,
      totalXP:          req.user.xp,
      level:            req.user.level,
      rank:             req.user.rank,
      habitsCompleted:  completedHabitsToday,
      habitsTotal:      totalHabits,
      caloriesConsumed: todayMeals._sum.calories || 0,
      caloriesGoal:     2200,
      sessionsThisWeek: gymThisWeek + cardioThisWeek,
      avgSleep:         parseFloat(avgSleep.toFixed(1)),
      sleepHours:       parseFloat(avgSleep.toFixed(1)),
      activityHeatmap:  weeklyHeatmap,
      radarData,
      topGoals:         topGoals.map((g) => ({
        id:           g.id,
        title:        g.title,
        description:  g.description || '',
        category:     g.category,
        targetValue:  g.targetValue,
        currentValue: g.currentValue,
        unit:         g.unit || '',
        deadline:     g.deadline,
        priority:     g.priority,
        completed:    g.status === 'completed',
        createdAt:    g.createdAt,
      })),
      recentActivity: formattedFeed,
      macros: {
        protein:       macroAgg._sum.protein  || 0,
        carbs:         macroAgg._sum.carbs    || 0,
        fat:           macroAgg._sum.fat      || 0,
        totalCalories: macroAgg._sum.calories || 0,
      },
      waterCups: dailyLogToday?.waterGlasses || 0,
      waterGoal: 8,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
