const router  = require('express').Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');
const rpg = require('../lib/rpg');

const prisma = new PrismaClient();

/* ─── XP por stake ───────────────────────────────────────────────── */
function calcXP(stake) {
  if (stake < 10)  return 50;
  if (stake < 25)  return 100;
  if (stake < 50)  return 200;
  if (stake < 100) return 350;
  return 500;
}

/* ─── Verifica condición del bet ─────────────────────────────────── */
async function verifyCondition(userId, conditionType, conditionValue, from, to) {
  switch (conditionType) {
    case 'gym_sessions': {
      const n = await prisma.gymSession.count({ where: { userId, date: { gte: from, lte: to } } });
      return n >= conditionValue;
    }
    case 'cardio_sessions': {
      const n = await prisma.cardioSession.count({ where: { userId, date: { gte: from, lte: to } } });
      return n >= conditionValue;
    }
    case 'habit_days': {
      const logs = await prisma.habitLog.findMany({
        where: { userId, date: { gte: from, lte: to }, completed: true },
        select: { date: true },
      });
      const days = new Set(logs.map(l => l.date.toISOString().split('T')[0]));
      return days.size >= conditionValue;
    }
    case 'streak_days': {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { streak: true } });
      return (user?.streak ?? 0) >= conditionValue;
    }
    case 'active_days': {
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
      return days.size >= conditionValue;
    }
    case 'nutrition_healthy': {
      // conditionValue = % mínimo de comidas saludables (ej. 70 = 70%)
      const [healthy, total] = await Promise.all([
        prisma.meal.count({ where: { userId, date: { gte: from, lte: to }, category: 'HEALTHY' } }),
        prisma.meal.count({ where: { userId, date: { gte: from, lte: to } } }),
      ]);
      if (total === 0) return false;
      return Math.round((healthy / total) * 100) >= conditionValue;
    }
    default:
      return false;
  }
}

/* ─── GET /api/bets ──────────────────────────────────────────────── */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const bets = await prisma.bet.findMany({
      where: { status: { in: ['open', 'active'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, username: true, avatar: true } },
        acceptances: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
        },
      },
    });
    res.json({ bets });
  } catch (err) { next(err); }
});

/* ─── GET /api/bets/my ───────────────────────────────────────────── */
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const [created, accepted] = await Promise.all([
      prisma.bet.findMany({
        where: { creatorId: req.user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, username: true, avatar: true } },
          acceptances: { include: { user: { select: { id: true, username: true } } } },
        },
      }),
      prisma.betAcceptance.findMany({
        where: { userId: req.user.id },
        include: {
          bet: {
            include: {
              creator: { select: { id: true, username: true, avatar: true } },
              acceptances: { include: { user: { select: { id: true, username: true } } } },
            },
          },
        },
      }),
    ]);
    res.json({ created, accepted });
  } catch (err) { next(err); }
});

/* ─── POST /api/bets ─────────────────────────────────────────────── */
router.post('/',
  authenticate,
  [
    body('title').trim().notEmpty(),
    body('conditionType').isIn(['gym_sessions', 'cardio_sessions', 'habit_days', 'streak_days', 'active_days', 'nutrition_healthy']),
    body('conditionValue').isInt({ min: 1 }),
    body('stake').isFloat({ min: 1 }),
    body('deadline').isISO8601(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { title, conditionType, conditionValue, stake, deadline } = req.body;
      const xpReward = calcXP(stake);
      const stakeAmount = parseFloat(stake);

      const creator = await prisma.user.findUnique({ where: { id: req.user.id }, select: { gold: true } });
      if (creator.gold < stakeAmount) {
        return res.status(400).json({ error: `Oro insuficiente para la apuesta (necesitas ${stakeAmount} 🪙)` });
      }

      const bet = await prisma.bet.create({
        data: {
          creatorId: req.user.id,
          title,
          conditionType,
          conditionValue: parseInt(conditionValue),
          stake: stakeAmount,
          currency: 'GOLD',
          deadline: new Date(deadline),
          xpReward,
        },
        include: {
          creator: { select: { id: true, username: true, avatar: true } },
          acceptances: [],
        },
      });

      await prisma.user.update({ where: { id: req.user.id }, data: { gold: { decrement: stakeAmount } } });

      res.status(201).json({ bet });
    } catch (err) { next(err); }
  }
);

/* ─── POST /api/bets/:id/accept ──────────────────────────────────── */
router.post('/:id/accept',
  authenticate,
  [body('amount').isFloat({ min: 0.01 }).withMessage('Debes apostar un monto mayor a 0')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const bet = await prisma.bet.findUnique({
        where: { id: req.params.id },
        include: { acceptances: true },
      });
      if (!bet) return res.status(404).json({ error: 'Bet not found' });
      if (bet.status !== 'open') return res.status(400).json({ error: 'Bet is not open' });
      if (bet.creatorId === req.user.id) return res.status(400).json({ error: 'Cannot accept your own bet' });

      const already = bet.acceptances.find(a => a.userId === req.user.id);
      if (already) return res.status(400).json({ error: 'Already accepted' });

      const acceptAmount = parseFloat(parseFloat(req.body.amount).toFixed(2));

      const acceptor = await prisma.user.findUnique({ where: { id: req.user.id }, select: { gold: true } });
      if (acceptor.gold < acceptAmount) {
        return res.status(400).json({ error: `Oro insuficiente (necesitas ${acceptAmount} 🪙)` });
      }

      const [acceptance] = await Promise.all([
        prisma.betAcceptance.create({
          data: { betId: bet.id, userId: req.user.id, amount: acceptAmount },
        }),
        prisma.bet.update({ where: { id: bet.id }, data: { status: 'active' } }),
        prisma.user.update({ where: { id: req.user.id }, data: { gold: { decrement: acceptAmount } } }),
      ]);

      res.status(201).json({ acceptance, acceptAmount });
    } catch (err) { next(err); }
  }
);

/* ─── POST /api/bets/:id/settle ──────────────────────────────────── */
// Settle automático — verifica los datos reales del creador
router.post('/:id/settle', authenticate, async (req, res, next) => {
  try {
    const bet = await prisma.bet.findUnique({
      where: { id: req.params.id },
      include: { acceptances: true },
    });
    if (!bet) return res.status(404).json({ error: 'Bet not found' });
    if (bet.creatorId !== req.user.id) return res.status(403).json({ error: 'Only creator can settle' });
    if (!['open', 'active'].includes(bet.status)) return res.status(400).json({ error: 'Already settled' });

    const from = bet.createdAt;
    const to   = bet.deadline;
    const won  = await verifyCondition(bet.creatorId, bet.conditionType, bet.conditionValue, from, to);

    const acceptorStatuses = bet.acceptances.map(a => ({
      id: a.id,
      status: won ? 'lost' : 'won',
    }));

    await Promise.all([
      prisma.bet.update({
        where: { id: bet.id },
        data: { status: won ? 'won' : 'lost', result: won, settledAt: new Date() },
      }),
      ...acceptorStatuses.map(a =>
        prisma.betAcceptance.update({ where: { id: a.id }, data: { status: a.status } })
      ),
    ]);

    // XP al creador si ganó
    if (won) {
      const bonusXP = bet.xpReward + (bet.acceptances.length * 25);
      await rpg.awardXP(bet.creatorId, 'habits', bonusXP, prisma);
      await rpg.updateCombo(bet.creatorId, 'habits', prisma);
      await rpg.checkAndUpdateStreak(bet.creatorId, prisma);
    }

    // XP a aceptadores que ganaron (creador falló) — run in parallel per user
    if (!won) {
      await Promise.all(bet.acceptances.map(async (a) => {
        await rpg.awardXP(a.userId, 'habits', 50, prisma);
        await rpg.updateCombo(a.userId, 'habits', prisma);
        await rpg.checkAndUpdateStreak(a.userId, prisma);
      }));
    }

    const totalAcceptorPool = bet.acceptances.reduce((s, a) => s + a.amount, 0);
    const totalPot          = bet.stake + totalAcceptorPool;

    // Creador gana: su stake + todo lo apostado por aceptadores
    const creatorWins = won ? totalPot : 0;

    // Aceptadores ganan proporcional: su apuesta de vuelta + su parte del stake del creador
    const acceptorBreakdown = !won ? bet.acceptances.map(a => ({
      userId: a.userId,
      gets: parseFloat((a.amount + (totalAcceptorPool > 0 ? (a.amount / totalAcceptorPool) * bet.stake : 0)).toFixed(2)),
    })) : [];

    if (won) {
      // Creator wins: gets back stake + all acceptor amounts
      await prisma.user.update({
        where: { id: bet.creatorId },
        data: { gold: { increment: totalPot } },
      });
    } else if (bet.acceptances.length > 0) {
      // Acceptors win: get back their amount + proportional share of creator's stake
      await Promise.all(acceptorBreakdown.map(({ userId, gets }) =>
        prisma.user.update({ where: { id: userId }, data: { gold: { increment: Math.floor(gets) } } })
      ));
    }

    res.json({
      won,
      totalPot,
      creatorWins,
      acceptorBreakdown,
      xpAwarded: won ? bet.xpReward + (bet.acceptances.length * 25) : 0,
    });
  } catch (err) { next(err); }
});

/* ─── DELETE /api/bets/:id ────────────────────────────────────────── */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const bet = await prisma.bet.findUnique({ where: { id: req.params.id }, include: { acceptances: true } });
    if (!bet) return res.status(404).json({ error: 'Bet not found' });
    if (bet.creatorId !== req.user.id) return res.status(403).json({ error: 'Solo el creador puede cancelar' });
    if (bet.status !== 'open') return res.status(400).json({ error: 'Solo se pueden cancelar apuestas abiertas sin aceptantes' });
    if (bet.acceptances.length > 0) return res.status(400).json({ error: 'No se puede cancelar: ya tiene aceptantes' });

    await Promise.all([
      prisma.bet.update({ where: { id: bet.id }, data: { status: 'cancelled' } }),
      prisma.user.update({ where: { id: req.user.id }, data: { gold: { increment: bet.stake } } }),
    ]);

    res.json({ message: 'Apuesta cancelada. Oro devuelto.', refunded: bet.stake });
  } catch (err) { next(err); }
});

module.exports = router;
