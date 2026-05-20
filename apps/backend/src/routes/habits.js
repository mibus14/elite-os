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

// GET /api/habits
router.get('/', authenticate, async (req, res, next) => {
  try {
    const habits = await prisma.habit.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' },
      include: {
        habitLogs: {
          where: { date: startOfDay(new Date()) },
          take: 1,
        },
      },
    });

    const result = habits.map((h) => ({
      ...h,
      completedToday: h.habitLogs.length > 0 && h.habitLogs[0].completed,
      todayCount: h.habitLogs.length > 0 ? h.habitLogs[0].count : 0,
      habitLogs: undefined,
    }));

    res.json({ habits: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/habits
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('frequency').optional().isIn(['daily', 'weekly']),
    body('targetCount').optional().isInt({ min: 1 }),
    body('xpReward').optional().isInt({ min: 1 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, description, icon, color, frequency, targetCount, xpReward } = req.body;

      const habit = await prisma.habit.create({
        data: {
          userId: req.user.id,
          name,
          description: description || null,
          icon: icon || '⭐',
          color: color || '#6366f1',
          frequency: frequency || 'daily',
          targetCount: targetCount || 1,
          xpReward: xpReward || 10,
        },
      });

      res.status(201).json({ habit });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/habits/:id
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const habit = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    const { name, description, icon, color, frequency, targetCount, xpReward } = req.body;

    const updated = await prisma.habit.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(frequency !== undefined && { frequency }),
        ...(targetCount !== undefined && { targetCount }),
        ...(xpReward !== undefined && { xpReward }),
      },
    });

    res.json({ habit: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/habits/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const habit = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    await prisma.habit.delete({ where: { id: req.params.id } });
    res.json({ message: 'Habit deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/habits/:id/log
router.post('/:id/log', authenticate, async (req, res, next) => {
  try {
    const habit = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    const today = startOfDay(new Date());
    const { completed = true, count } = req.body;

    const existing = await prisma.habitLog.findUnique({
      where: { habitId_date: { habitId: habit.id, date: today } },
    });

    let log;
    let xpAwarded = 0;

    if (existing) {
      const wasCompleted = existing.completed;
      log = await prisma.habitLog.update({
        where: { id: existing.id },
        data: {
          completed,
          count: count !== undefined ? count : (completed ? existing.count + 1 : 0),
        },
      });
      // Award XP only if transitioning to completed
      if (!wasCompleted && completed) {
        const { finalXP } = await rpg.awardXP(req.user.id, 'habits', habit.xpReward, prisma);
        xpAwarded = finalXP;
        await rpg.updateCombo(req.user.id, 'habits', prisma);
        await rpg.checkAndUpdateStreak(req.user.id, prisma);
      }
    } else {
      log = await prisma.habitLog.create({
        data: {
          habitId: habit.id,
          userId: req.user.id,
          date: today,
          completed,
          count: count !== undefined ? count : (completed ? 1 : 0),
        },
      });
      if (completed) {
        const { finalXP } = await rpg.awardXP(req.user.id, 'habits', habit.xpReward, prisma);
        xpAwarded = finalXP;
        await rpg.updateCombo(req.user.id, 'habits', prisma);
        await rpg.checkAndUpdateStreak(req.user.id, prisma);
      }
    }

    res.json({ log, xpAwarded });
  } catch (err) {
    next(err);
  }
});

// GET /api/habits/logs/heatmap
router.get('/logs/heatmap', authenticate, async (req, res, next) => {
  try {
    const end = startOfDay(new Date());
    const start = new Date(end);
    start.setDate(start.getDate() - 364);

    const logs = await prisma.habitLog.findMany({
      where: {
        userId: req.user.id,
        date: { gte: start, lte: end },
        completed: true,
      },
      select: { date: true },
    });

    const countMap = {};
    for (const log of logs) {
      const key = new Date(log.date).toISOString().slice(0, 10);
      countMap[key] = (countMap[key] || 0) + 1;
    }

    const result = Object.entries(countMap).map(([date, count]) => ({ date, count }));
    res.json({ heatmap: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
