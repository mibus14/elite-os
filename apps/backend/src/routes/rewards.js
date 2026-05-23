const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();

/* ─── Achievement → Reward map ───────────────────────────────────── */
const ACHIEVEMENT_REWARDS = {
  constante: {
    label: 'Comida Trampa',
    emoji: '🍔',
    desc:  'Una comida completamente libre, sin restricciones ni culpa',
  },
  incansable: {
    label: 'Día Libre',
    emoji: '🏖️',
    desc:  'Un día sin entrenar ni obligaciones. Te lo ganaste con 30 días de racha',
  },
  combo_iniciado: {
    label: 'Snack Libre',
    emoji: '🍕',
    desc:  'Un capricho sin culpa: el antojo que quieras, cuando quieras',
  },
  combo_master: {
    label: 'Fin de Semana Libre',
    emoji: '🎉',
    desc:  'Sábado y domingo sin restricciones. 10 días de combo merecen esto',
  },
  veterano: {
    label: 'Tarde de Ocio',
    emoji: '🌙',
    desc:  'Una tarde entera para lo que quieras, sin cargo de conciencia',
  },
  maestro: {
    label: 'Vacaciones (3 días)',
    emoji: '✈️',
    desc:  '3 días de descanso total. Nivel 20 es una hazaña legendaria',
  },
  titan: {
    label: 'Día de Descanso Total',
    emoji: '💪',
    desc:  'Descansa del gym hoy. Tu cuerpo lo necesita y lo ha ganado',
  },
  mente: {
    label: 'Noche de Entretenimiento',
    emoji: '📺',
    desc:  'Series, películas, videojuegos — toda la noche sin límite',
  },
  leyenda: {
    label: 'Semana Sin Reglas',
    emoji: '👑',
    desc:  '7 días de libertad total. Solo una leyenda llega hasta aquí',
  },
};

/* ─── Check which achievements are currently unlocked ────────────── */
function getUnlockedAchievements(user) {
  const unlocked = [];
  if ((user.streak      ?? 0) >= 7)  unlocked.push('constante');
  if ((user.streak      ?? 0) >= 30) unlocked.push('incansable');
  if ((user.comboStreak ?? 0) >= 3)  unlocked.push('combo_iniciado');
  if ((user.comboStreak ?? 0) >= 10) unlocked.push('combo_master');
  if ((user.level       ?? 1) >= 10) unlocked.push('veterano');
  if ((user.level       ?? 1) >= 20) unlocked.push('maestro');
  if ((user.statStr     ?? 0) >= 50) unlocked.push('titan');
  if ((user.statInt     ?? 0) >= 50) unlocked.push('mente');
  if (user.rank === 'Diamond' && (user.streak ?? 0) >= 30) unlocked.push('leyenda');
  return unlocked;
}

/* ─── POST /api/rewards/sync ─────────────────────────────────────── */
// Called after any XP event — grants new rewards for newly met conditions
router.post('/sync', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const unlocked = getUnlockedAchievements(user);

    const existingUnredeemed = await prisma.earnedReward.findMany({
      where: { userId: req.user.id, achievementId: { in: unlocked }, redeemedAt: null },
      select: { achievementId: true },
    });
    const alreadyGranted = new Set(existingUnredeemed.map((r) => r.achievementId));

    const toCreate = unlocked
      .filter((id) => !alreadyGranted.has(id) && ACHIEVEMENT_REWARDS[id])
      .map((id) => ({
        userId:        req.user.id,
        achievementId: id,
        rewardLabel:   ACHIEVEMENT_REWARDS[id].label,
        rewardEmoji:   ACHIEVEMENT_REWARDS[id].emoji,
        rewardDesc:    ACHIEVEMENT_REWARDS[id].desc,
      }));

    const newRewards = [];
    for (const data of toCreate) {
      const reward = await prisma.earnedReward.create({ data });
      newRewards.push(reward);
    }

    res.json({ newRewards, count: newRewards.length });
  } catch (err) { next(err); }
});

/* ─── GET /api/rewards ───────────────────────────────────────────── */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const rewards = await prisma.earnedReward.findMany({
      where:   { userId: req.user.id },
      orderBy: { earnedAt: 'desc' },
    });
    const pending  = rewards.filter(r => !r.redeemedAt);
    const redeemed = rewards.filter(r =>  r.redeemedAt);
    res.json({ pending, redeemed });
  } catch (err) { next(err); }
});

/* ─── POST /api/rewards/:id/redeem ───────────────────────────────── */
router.post('/:id/redeem', authenticate, async (req, res, next) => {
  try {
    const reward = await prisma.earnedReward.findUnique({ where: { id: req.params.id } });
    if (!reward)                    return res.status(404).json({ error: 'Reward not found' });
    if (reward.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (reward.redeemedAt)          return res.status(400).json({ error: 'Already redeemed' });

    const updated = await prisma.earnedReward.update({
      where: { id: req.params.id },
      data:  { redeemedAt: new Date() },
    });
    res.json({ reward: updated });
  } catch (err) { next(err); }
});

module.exports = router;
