const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();

function startOfDay(d) {
  const dt = new Date(d);
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

function parseLocalDate(localDate) {
  if (localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    return new Date(localDate + 'T00:00:00.000Z');
  }
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDays(d, n) {
  const dt = new Date(d);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt;
}

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = parseLocalDate(req.query.localDate);
    const weekStart = startOfDay(addDays(today, -6));

    // ── Today's habits ────────────────────────────────────────────────────────
    const [totalHabits, completedHabitsToday] = await Promise.all([
      prisma.habit.count({ where: { userId } }),
      prisma.habitLog.count({
        where: { userId, date: today, completed: true },
      }),
    ]);

    // ── Weekly session counts (for sessionsThisWeek stat card) ───────────────
    const [gymThisWeek, cardioThisWeek] = await Promise.all([
      prisma.gymSession.count({ where: { userId, date: { gte: weekStart } } }),
      prisma.cardioSession.count({ where: { userId, date: { gte: weekStart } } }),
    ]);

    // ── Sleep average (7 days) ────────────────────────────────────────────────
    const sleepLogs = await prisma.dailyLog.findMany({
      where: { userId, date: { gte: weekStart }, sleepHours: { not: null } },
      select: { sleepHours: true },
    });
    const avgSleep =
      sleepLogs.length > 0
        ? sleepLogs.reduce((s, l) => s + (l.sleepHours ?? 0), 0) / sleepLogs.length
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
      prisma.learningItem.findMany({
        where: { userId, completed: true },
        orderBy: { completedAt: 'desc' },
        take: 5,
        select: { id: true, tag: true, title: true, completedAt: true },
      }),
    ]);

    const activityFeed = [
      ...recentGym.map((s) => ({ type: 'gym', ...s, label: `Gym: ${s.name}`, xp: 50 })),
      ...recentCardio.map((s) => ({ type: 'cardio', ...s, label: `Cardio: ${s.type}`, xp: 30 })),
      ...recentLearning.map((s) => ({ type: 'learning', id: s.id, date: s.completedAt, label: `Aprendizaje: ${s.title}`, xp: 30 })),
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

    const localDateStr = req.query.localDate || today.toISOString().slice(0, 10);
    const heatmapMap = {};
    const addToHeatmap = (items, weight) => {
      for (const item of items) {
        let key = new Date(item.date).toISOString().slice(0, 10);
        // Old data stored as UTC-midnight may be 1 day ahead of local date for UTC- users;
        // cap to today so evening activities don't fall into invisible future cells.
        if (key > localDateStr) key = localDateStr;
        heatmapMap[key] = (heatmapMap[key] || 0) + weight;
      }
    };
    addToHeatmap(heatmapHabits, 1);
    addToHeatmap(heatmapGym, 3);
    addToHeatmap(heatmapCardio, 2);

    const weeklyHeatmap = Object.entries(heatmapMap).map(([date, count]) => ({ date, count }));

    // ── Today + Yesterday XP (actual, from DailyCombo) ───────────────────
    const yesterday = startOfDay(addDays(today, -1));
    const [todayCombo, yesterdayCombo] = await Promise.all([
      prisma.dailyCombo.findFirst({ where: { userId, date: today }, select: { totalXP: true } }),
      prisma.dailyCombo.findFirst({ where: { userId, date: yesterday }, select: { totalXP: true } }),
    ]);
    const todayXP     = todayCombo?.totalXP     ?? 0;
    const yesterdayXP = yesterdayCombo?.totalXP ?? 0;

    // ── Macros + calories today (single query) ────────────────────────────
    const macroAgg = await prisma.meal.aggregate({
      where: { userId, date: today },
      _sum: { calories: true, protein: true, carbs: true, fat: true },
    });
    const todayCalories = macroAgg._sum.calories || 0;

    // ── Top goals ─────────────────────────────────────────────────────────
    const topGoals = await prisma.goal.findMany({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    // ── Radar data (activity ratios) ──────────────────────────────────────
    const [totalGym, totalCardio, totalLearning, totalGoalsCompleted] = await Promise.all([
      prisma.gymSession.count({ where: { userId } }),
      prisma.cardioSession.count({ where: { userId } }),
      prisma.learningItem.count({ where: { userId, completed: true } }),
      prisma.goal.count({ where: { userId, status: 'completed' } }),
    ]);
    const radarData = [
      { subject: 'Gym',       value: Math.min(100, totalGym * 3),             fullMark: 100 },
      { subject: 'Nutrition', value: Math.min(100, todayCalories > 0 ? 80 : 0), fullMark: 100 },
      { subject: 'Cardio',    value: Math.min(100, totalCardio * 4),          fullMark: 100 },
      { subject: 'Learning',  value: Math.min(100, totalLearning * 8),        fullMark: 100 },
      { subject: 'Habits',    value: totalHabits > 0 ? Math.round((completedHabitsToday / totalHabits) * 100) : 0, fullMark: 100 },
      { subject: 'Goals',     value: Math.min(100, totalGoalsCompleted * 12), fullMark: 100 },
    ];

    // ── Weekly XP per day (actual, from DailyCombo) ──────────────────────
    const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const weekDays = Array.from({ length: 7 }, (_, i) => startOfDay(addDays(today, -(6 - i))));
    const weekCombos = await prisma.dailyCombo.findMany({
      where: { userId, date: { gte: weekDays[0] } },
      select: { date: true, totalXP: true },
    });
    const comboByDate = Object.fromEntries(
      weekCombos.map((c) => [c.date.toISOString().slice(0, 10), c.totalXP])
    );
    const weeklyXPPerDay = weekDays.map((day) => ({
      day: DAYS[day.getDay()],
      xp: comboByDate[day.toISOString().slice(0, 10)] ?? 0,
    }));

    // ── Water today + nutrition goal ─────────────────────────────────────
    const [dailyLogToday, nutritionGoal] = await Promise.all([
      prisma.dailyLog.findUnique({ where: { userId_date: { userId, date: today } } }),
      prisma.nutritionGoal.findUnique({ where: { userId } }),
    ]);

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
      caloriesConsumed: todayCalories,
      caloriesGoal:     nutritionGoal?.calories ?? 2200,
      sessionsThisWeek: gymThisWeek + cardioThisWeek,
      avgSleep:         parseFloat(avgSleep.toFixed(1)),
      sleepHours:       dailyLogToday?.sleepHours ?? 0,
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
