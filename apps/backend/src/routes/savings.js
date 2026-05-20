const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();

function weekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Cuenta días únicos activos en la semana (gym + cardio + habitLogs)
async function countActiveDays(userId, from, to) {
  const [gym, cardio, habits] = await Promise.all([
    prisma.gymSession.findMany({ where: { userId, date: { gte: from, lte: to } }, select: { date: true } }),
    prisma.cardioSession.findMany({ where: { userId, date: { gte: from, lte: to } }, select: { date: true } }),
    prisma.habitLog.findMany({ where: { userId, date: { gte: from, lte: to }, completed: true }, select: { date: true } }),
  ]);

  const days = new Set([
    ...gym.map(s => s.date.toISOString().split('T')[0]),
    ...cardio.map(s => s.date.toISOString().split('T')[0]),
    ...habits.map(s => s.date.toISOString().split('T')[0]),
  ]);
  return days.size;
}

/* ─── GET /api/savings/config ────────────────────────────────────── */
router.get('/config', authenticate, async (req, res, next) => {
  try {
    const config = await prisma.savingsConfig.findUnique({ where: { userId: req.user.id } });
    res.json({ config: config ?? { weeklyAmount: 0, currency: 'USD' } });
  } catch (err) { next(err); }
});

/* ─── POST /api/savings/config ───────────────────────────────────── */
router.post('/config', authenticate, async (req, res, next) => {
  try {
    const { weeklyAmount, currency } = req.body;
    const config = await prisma.savingsConfig.upsert({
      where: { userId: req.user.id },
      update: { weeklyAmount: parseFloat(weeklyAmount), currency: currency || 'USD' },
      create: { userId: req.user.id, weeklyAmount: parseFloat(weeklyAmount), currency: currency || 'USD' },
    });
    res.json({ config });
  } catch (err) { next(err); }
});

/* ─── GET /api/savings/summary ───────────────────────────────────── */
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const [config, entries] = await Promise.all([
      prisma.savingsConfig.findUnique({ where: { userId: req.user.id } }),
      prisma.savingsEntry.findMany({
        where: { userId: req.user.id },
        orderBy: { weekStart: 'desc' },
      }),
    ]);

    const weeklyAmount = config?.weeklyAmount ?? 0;
    const currency     = config?.currency ?? 'USD';
    const totalSaved   = entries.filter(e => e.earned).reduce((s, e) => s + e.weeklyAmount, 0);
    const totalLost    = entries.filter(e => !e.earned).reduce((s, e) => s + e.weeklyAmount, 0);
    const streak       = (() => {
      let s = 0;
      for (const e of entries) { if (e.earned) s++; else break; }
      return s;
    })();

    // Semana actual
    const ws  = weekStart();
    const we  = new Date(ws); we.setDate(ws.getDate() + 6);
    const activeDays = await countActiveDays(req.user.id, ws, we);
    const currentEntry = entries.find(e => e.weekStart.toISOString().split('T')[0] === ws.toISOString().split('T')[0]);

    res.json({
      weeklyAmount,
      currency,
      totalSaved,
      totalLost,
      streak,
      entries,
      currentWeek: {
        activeDays,
        earned: currentEntry?.earned ?? null,
        processed: !!currentEntry,
        needed: 4,
      },
    });
  } catch (err) { next(err); }
});

/* ─── POST /api/savings/process-week ────────────────────────────── */
// Cierra la semana actual y registra si se ganó o perdió
router.post('/process-week', authenticate, async (req, res, next) => {
  try {
    const config = await prisma.savingsConfig.findUnique({ where: { userId: req.user.id } });
    if (!config || config.weeklyAmount === 0)
      return res.status(400).json({ error: 'Configura tu apuesta semanal primero' });

    const ws = weekStart();
    const we = new Date(ws); we.setDate(ws.getDate() + 6);

    const activeDays = await countActiveDays(req.user.id, ws, we);
    const earned     = activeDays >= 4;

    const entry = await prisma.savingsEntry.upsert({
      where:  { userId_weekStart: { userId: req.user.id, weekStart: ws } },
      update: { earned, activeDays, weeklyAmount: config.weeklyAmount },
      create: { userId: req.user.id, weekStart: ws, weeklyAmount: config.weeklyAmount, earned, activeDays },
    });

    res.json({ entry, earned, activeDays });
  } catch (err) { next(err); }
});

module.exports = router;
