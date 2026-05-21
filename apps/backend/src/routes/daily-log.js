const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/daily-log/today
router.get('/today', authenticate, async (req, res, next) => {
  try {
    const log = await prisma.dailyLog.findUnique({
      where: { userId_date: { userId: req.user.id, date: todayStart() } },
    });
    res.json({ log: log ?? null });
  } catch (err) { next(err); }
});

// POST /api/daily-log
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { sleepHours, energyLevel, mood, waterGlasses, notes } = req.body;
    const today = todayStart();

    const data = {};
    if (sleepHours  !== undefined) data.sleepHours  = parseFloat(sleepHours);
    if (energyLevel !== undefined) data.energyLevel = parseInt(energyLevel);
    if (mood        !== undefined) data.mood        = parseInt(mood);
    if (waterGlasses !== undefined) data.waterGlasses = parseInt(waterGlasses);
    if (notes       !== undefined) data.notes       = notes;

    const log = await prisma.dailyLog.upsert({
      where:  { userId_date: { userId: req.user.id, date: today } },
      update: data,
      create: { userId: req.user.id, date: today, sleepHours: 7, energyLevel: 5, mood: 5, waterGlasses: 0, ...data },
    });
    res.json({ log });
  } catch (err) { next(err); }
});

// GET /api/daily-log/week
router.get('/week', authenticate, async (req, res, next) => {
  try {
    const today = todayStart();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);

    const logs = await prisma.dailyLog.findMany({
      where:   { userId: req.user.id, date: { gte: weekAgo } },
      orderBy: { date: 'asc' },
    });
    res.json({ logs });
  } catch (err) { next(err); }
});

module.exports = router;
