const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();

const SEASON_DURATION_DAYS = 60;

const RANK_BONUS = {
  Bronze:   { bonusXP: 0,    bonusMultiplier: 1.0 },
  Silver:   { bonusXP: 50,   bonusMultiplier: 1.05 },
  Gold:     { bonusXP: 150,  bonusMultiplier: 1.10 },
  Platinum: { bonusXP: 400,  bonusMultiplier: 1.20 },
  Diamond:  { bonusXP: 1000, bonusMultiplier: 1.50 },
};

/** Ensure an active season exists, create first one if needed */
async function ensureActiveSeason(prisma) {
  let season = await prisma.season.findFirst({ where: { status: 'active' } });
  if (!season) {
    const lastSeason = await prisma.season.findFirst({ orderBy: { number: 'desc' } });
    const number = (lastSeason?.number ?? 0) + 1;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + SEASON_DURATION_DAYS);
    season = await prisma.season.create({ data: { number, startDate, endDate, status: 'active' } });
    console.log(`[SEASON] Season ${number} started — ends ${endDate.toISOString().slice(0,10)}`);
  }
  return season;
}

/** End the current season: save results, reset stats, start next season */
async function endCurrentSeason(prisma) {
  const season = await prisma.season.findFirst({ where: { status: 'active' } });
  if (!season) return null;

  const users = await prisma.user.findMany({
    select: { id: true, xp: true, level: true, rank: true, streak: true },
  });

  for (const user of users) {
    const bonus = RANK_BONUS[user.rank] || RANK_BONUS.Bronze;

    await prisma.seasonResult.create({
      data: {
        userId: user.id,
        seasonId: season.id,
        finalRank: user.rank,
        finalXP: user.xp,
        finalLevel: user.level,
        finalStreak: user.streak,
        bonusXP: bonus.bonusXP,
        bonusMultiplier: bonus.bonusMultiplier,
      },
    });

    const newXP = bonus.bonusXP;
    const newLevel = Math.floor(newXP / 500) + 1;
    let newRank = 'Bronze';
    if (newXP >= 10001) newRank = 'Diamond';
    else if (newXP >= 5001) newRank = 'Platinum';
    else if (newXP >= 2001) newRank = 'Gold';
    else if (newXP >= 501) newRank = 'Silver';

    await prisma.user.update({
      where: { id: user.id },
      data: {
        xp: newXP, level: newLevel, rank: newRank,
        streak: 0, longestStreak: 0,
        statStr: 0, statInt: 0, statVit: 0, statDis: 0, statWis: 0, statGol: 0,
        comboStreak: 0, failStreak: 0, inPenitence: false,
        seasonMultiplier: bonus.bonusMultiplier,
        seasonXPBonus: bonus.bonusXP,
      },
    });
  }

  await prisma.season.update({ where: { id: season.id }, data: { status: 'completed' } });
  console.log(`[SEASON] Season ${season.number} ended. ${users.length} users reset.`);

  // Start next season immediately
  return ensureActiveSeason(prisma);
}

module.exports.ensureActiveSeason = ensureActiveSeason;
module.exports.endCurrentSeason = endCurrentSeason;

// ─── GET /api/seasons/current ────────────────────────────────────────────────
router.get('/current', authenticate, async (req, res, next) => {
  try {
    let season;
    try {
      season = await ensureActiveSeason(prisma);
    } catch (dbErr) {
      // Tabla seasons no existe en DB (falta migración) → devolver temporada sintética
      console.error('[SEASON] DB error, returning synthetic season:', dbErr.message);
      const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
      const end = new Date(start); end.setDate(end.getDate() + 60);
      const myRank = req.user.rank || 'Bronze';
      return res.json({
        season: { number: 1, startDate: start, endDate: end, totalDays: 60, daysElapsed: 0, daysLeft: 60, progressPct: 0 },
        myPosition: 1,
        myRank,
        nextBonus: RANK_BONUS[myRank] || RANK_BONUS.Bronze,
        leaderboard: [],
      });
    }

    const now = new Date();
    const totalDays = Math.max(1, Math.round((new Date(season.endDate) - new Date(season.startDate)) / 86400000));
    const daysElapsed = Math.max(0, Math.round((now - new Date(season.startDate)) / 86400000));
    const daysLeft = Math.max(0, Math.round((new Date(season.endDate) - now) / 86400000));

    // User rank in this season (by current XP)
    let allUsers = [];
    try {
      allUsers = await prisma.user.findMany({
        select: { id: true, username: true, xp: true, rank: true, class: true, avatar: true, level: true },
        orderBy: { xp: 'desc' },
      });
    } catch (_) { /* users table fine, ignore */ }

    const position = Math.max(1, allUsers.findIndex(u => u.id === req.user.id) + 1);
    const myRank = req.user.rank || 'Bronze';
    const nextBonus = RANK_BONUS[myRank] || RANK_BONUS.Bronze;

    res.json({
      season: {
        number: season.number,
        startDate: season.startDate,
        endDate: season.endDate,
        totalDays,
        daysElapsed,
        daysLeft,
        progressPct: Math.round((daysElapsed / totalDays) * 100),
      },
      myPosition: position,
      myRank,
      nextBonus,
      leaderboard: allUsers.slice(0, 10),
    });
  } catch (err) { next(err); }
});

// ─── GET /api/seasons/history ────────────────────────────────────────────────
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const results = await prisma.seasonResult.findMany({
      where: { userId: req.user.id },
      include: { season: { select: { number: true, startDate: true, endDate: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ results });
  } catch (err) { next(err); }
});

// ─── POST /api/seasons/end (admin / debug only) ───────────────────────────────
router.post('/end', authenticate, async (req, res, next) => {
  try {
    // Only allow if NODE_ENV is not production, or add admin check here
    if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const adminSecret = req.headers['x-admin-secret'];
    if (process.env.ADMIN_SECRET && adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const nextSeason = await endCurrentSeason(prisma);
    res.json({ message: 'Season ended', nextSeason });
  } catch (err) { next(err); }
});

module.exports.router = router;
