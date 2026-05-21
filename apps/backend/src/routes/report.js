const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/report/summary
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [
      user,
      totalGymSessions,
      gymVolume,
      totalCardio,
      totalMeals,
      avgCalories,
      totalHabits,
      totalHabitLogs,
      totalGoals,
      completedGoals,
      totalLearning,
      sleepLogs,
      savingsGoals,
      bets,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true, level: true, rank: true, streak: true, longestStreak: true, class: true, createdAt: true },
      }),
      prisma.gymSession.count({ where: { userId } }),
      prisma.gymSession.aggregate({ where: { userId }, _sum: { totalVolume: true, duration: true } }),
      prisma.cardioSession.aggregate({
        where: { userId },
        _count: { id: true },
        _sum: { duration: true, distance: true, calories: true },
      }),
      prisma.meal.count({ where: { userId } }),
      prisma.meal.aggregate({ where: { userId }, _avg: { calories: true } }),
      prisma.habit.count({ where: { userId } }),
      prisma.habitLog.count({ where: { userId, completed: true } }),
      prisma.goal.count({ where: { userId } }),
      prisma.goal.count({ where: { userId, status: 'completed' } }),
      prisma.learningSession.aggregate({
        where: { userId },
        _count: { id: true },
        _sum: { duration: true, xpEarned: true },
      }),
      prisma.dailyLog.aggregate({
        where: { userId },
        _avg: { sleepHours: true, energyLevel: true, mood: true },
        _count: { id: true },
      }),
      prisma.savingsGoal.aggregate({
        where: { userId },
        _count: { id: true },
        _sum: { currentAmount: true, targetAmount: true },
      }),
      prisma.bet.findMany({
        where: { OR: [{ creatorId: userId }, { challengedId: userId }] },
        select: { status: true, creatorId: true, winnerId: true },
      }),
    ]);

    const wonBets = bets.filter((b) => b.winnerId === userId).length;
    const lostBets = bets.filter(
      (b) => b.status === 'completed' && b.winnerId !== userId &&
        (b.creatorId === userId || true)
    ).length - wonBets;

    // Days since registration
    const daysSince = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000);

    res.json({
      profile: {
        xp: user.xp,
        level: user.level,
        rank: user.rank,
        class: user.class,
        streak: user.streak,
        longestStreak: user.longestStreak,
        daysSinceJoined: daysSince,
      },
      gym: {
        totalSessions: totalGymSessions,
        totalVolume: gymVolume._sum.totalVolume || 0,
        totalMinutes: gymVolume._sum.duration || 0,
      },
      cardio: {
        totalSessions: totalCardio._count.id || 0,
        totalMinutes: totalCardio._sum.duration || 0,
        totalKm: parseFloat((totalCardio._sum.distance || 0).toFixed(1)),
        totalCaloriesBurned: totalCardio._sum.calories || 0,
      },
      nutrition: {
        totalMeals,
        avgCaloriesPerMeal: Math.round(avgCalories._avg.calories || 0),
      },
      habits: {
        totalHabits,
        totalCompletions: totalHabitLogs,
      },
      goals: {
        total: totalGoals,
        completed: completedGoals,
      },
      learning: {
        totalSessions: totalLearning._count.id || 0,
        totalMinutes: totalLearning._sum.duration || 0,
        totalXP: totalLearning._sum.xpEarned || 0,
      },
      sleep: {
        totalLogs: sleepLogs._count.id || 0,
        avgHours: parseFloat((sleepLogs._avg.sleepHours || 0).toFixed(1)),
        avgEnergy: parseFloat((sleepLogs._avg.energyLevel || 0).toFixed(1)),
        avgMood: parseFloat((sleepLogs._avg.mood || 0).toFixed(1)),
      },
      savings: {
        totalGoals: savingsGoals._count.id || 0,
        totalSaved: parseFloat((savingsGoals._sum.currentAmount || 0).toFixed(2)),
        totalTarget: parseFloat((savingsGoals._sum.targetAmount || 0).toFixed(2)),
      },
      bets: { won: wonBets, lost: Math.max(0, lostBets) },
    });
  } catch (err) { next(err); }
});

module.exports = router;
