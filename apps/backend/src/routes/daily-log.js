const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();

// Parse the client's local date string (YYYY-MM-DD) to a UTC Date object for DB comparison.
// Falls back to UTC today if not provided.
function parseLocalDate(localDate) {
  if (localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    return new Date(localDate + 'T00:00:00.000Z');
  }
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// GET /api/daily-log/today
router.get('/today', authenticate, async (req, res, next) => {
  try {
    const today = parseLocalDate(req.query.localDate);
    const log = await prisma.dailyLog.findUnique({
      where: { userId_date: { userId: req.user.id, date: today } },
    });
    res.json({ log: log ?? null });
  } catch (err) { next(err); }
});

// POST /api/daily-log  — saves full daily log (sleep + energy + mood + water)
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { sleepHours, energyLevel, mood, waterGlasses, notes, localDate } = req.body;
    const today = parseLocalDate(localDate);

    const data = {};
    if (sleepHours   !== undefined) data.sleepHours   = parseFloat(sleepHours);
    if (energyLevel  !== undefined) data.energyLevel  = parseInt(energyLevel);
    if (mood         !== undefined) data.mood         = parseInt(mood);
    if (waterGlasses !== undefined) data.waterGlasses = parseInt(waterGlasses);
    if (notes        !== undefined) data.notes        = notes;

    const log = await prisma.dailyLog.upsert({
      where:  { userId_date: { userId: req.user.id, date: today } },
      update: data,
      create: { userId: req.user.id, date: today, waterGlasses: 0, ...data },
    });
    res.json({ log });
  } catch (err) { next(err); }
});

// PATCH /api/daily-log/water — updates only water glasses without touching sleep data
router.patch('/water', authenticate, async (req, res, next) => {
  try {
    const { waterGlasses, localDate } = req.body;
    if (waterGlasses === undefined) return res.status(400).json({ error: 'waterGlasses required' });
    const today = parseLocalDate(localDate);
    const glasses = Math.max(0, Math.min(20, parseInt(waterGlasses)));

    const existing = await prisma.dailyLog.findUnique({
      where: { userId_date: { userId: req.user.id, date: today } },
    });

    let log;
    if (existing) {
      log = await prisma.dailyLog.update({
        where: { id: existing.id },
        data: { waterGlasses: glasses },
      });
    } else {
      // Create a water-only record (no sleep data)
      log = await prisma.dailyLog.create({
        data: { userId: req.user.id, date: today, waterGlasses: glasses },
      });
    }
    res.json({ log });
  } catch (err) { next(err); }
});

// GET /api/daily-log/week
router.get('/week', authenticate, async (req, res, next) => {
  try {
    const today = parseLocalDate(req.query.localDate);
    const weekAgo = new Date(today);
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);

    const logs = await prisma.dailyLog.findMany({
      where:   { userId: req.user.id, date: { gte: weekAgo } },
      orderBy: { date: 'asc' },
    });
    res.json({ logs });
  } catch (err) { next(err); }
});

module.exports = router;
