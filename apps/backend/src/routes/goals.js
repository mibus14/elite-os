const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');
const rpg = require('../lib/rpg');
const axios = require('axios');

const prisma = new PrismaClient();

/* ─── Helper: recalcular currentValue desde milestones ───────────── */
async function recalcGoalProgress(goalId) {
  const milestones = await prisma.milestone.findMany({ where: { goalId } });
  if (!milestones.length) return null;
  const completedWeight = milestones
    .filter((m) => m.completed)
    .reduce((sum, m) => sum + m.weight, 0);
  return prisma.goal.update({
    where: { id: goalId },
    data: {
      currentValue: completedWeight,
      targetValue: 100,
      status: completedWeight >= 100 ? 'completed' : 'active',
    },
    include: { milestones: { orderBy: { order: 'asc' } } },
  });
}

/* ─── GET /api/goals ─────────────────────────────────────────────── */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, category } = req.query;
    const where = { userId: req.user.id };
    if (status) where.status = status;
    if (category) where.category = category;

    const goals = await prisma.goal.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: { milestones: { orderBy: { order: 'asc' } } },
    });

    const enriched = goals.map((g) => ({
      ...g,
      progressPercent:
        g.targetValue > 0 ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100)) : 0,
    }));

    res.json({ goals: enriched });
  } catch (err) {
    next(err);
  }
});

/* ─── POST /api/goals ────────────────────────────────────────────── */
router.post(
  '/',
  authenticate,
  [
    body('title').trim().notEmpty().withMessage('Title required'),
    body('category').notEmpty().withMessage('Category required'),
    body('targetValue').optional().isFloat({ min: 0 }),
    body('priority').optional().isIn(['low', 'medium', 'high']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { title, description, category, targetValue, currentValue, unit, deadline, status, priority, milestones } = req.body;

      const hasMilestones = Array.isArray(milestones) && milestones.length > 0;

      const goal = await prisma.goal.create({
        data: {
          userId: req.user.id,
          title,
          description: description || null,
          category,
          targetValue: hasMilestones ? 100 : parseFloat(targetValue) || 100,
          currentValue: hasMilestones ? 0 : parseFloat(currentValue) || 0,
          unit: unit || null,
          deadline: deadline ? new Date(deadline) : null,
          status: status || 'active',
          priority: priority || 'medium',
          milestones: hasMilestones
            ? {
                create: milestones.map((m, i) => ({
                  title: m.title,
                  weight: m.weight || Math.floor(100 / milestones.length),
                  order: i,
                })),
              }
            : undefined,
        },
        include: { milestones: { orderBy: { order: 'asc' } } },
      });

      res.status(201).json({ goal });
    } catch (err) {
      next(err);
    }
  }
);

/* ─── PUT /api/goals/:id ─────────────────────────────────────────── */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const goal = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const { title, description, category, targetValue, currentValue, unit, deadline, status, priority } = req.body;

    const updated = await prisma.goal.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(targetValue !== undefined && { targetValue: parseFloat(targetValue) }),
        ...(currentValue !== undefined && { currentValue: parseFloat(currentValue) }),
        ...(unit !== undefined && { unit }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
      },
      include: { milestones: { orderBy: { order: 'asc' } } },
    });

    res.json({ goal: updated });
  } catch (err) {
    next(err);
  }
});

/* ─── DELETE /api/goals/:id ──────────────────────────────────────── */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const goal = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    await prisma.goal.delete({ where: { id: req.params.id } });
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    next(err);
  }
});

/* ─── POST /api/goals/:id/progress ──────────────────────────────── */
router.post(
  '/:id/progress',
  authenticate,
  [body('value').isFloat({ min: 0 }).withMessage('Progress value required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const goal = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.user.id } });
      if (!goal) return res.status(404).json({ error: 'Goal not found' });

      const newValue = parseFloat(req.body.value);
      const updated = await prisma.goal.update({
        where: { id: req.params.id },
        data: {
          currentValue: newValue,
          status: newValue >= goal.targetValue && goal.status === 'active' ? 'completed' : goal.status,
        },
        include: { milestones: { orderBy: { order: 'asc' } } },
      });

      const justCompleted = updated.status === 'completed' && goal.status !== 'completed';
      if (justCompleted) {
        await rpg.awardXP(req.user.id, 'habits', 100, prisma);
        await rpg.updateCombo(req.user.id, 'habits', prisma);
        await rpg.checkAndUpdateStreak(req.user.id, prisma);
      }

      res.json({
        goal: updated,
        progressPercent: Math.min(100, Math.round((updated.currentValue / updated.targetValue) * 100)),
        justCompleted,
      });
    } catch (err) {
      next(err);
    }
  }
);

/* ─── POST /api/goals/:id/milestones/suggest ─────────────────────── */
router.post('/:id/milestones/suggest', authenticate, async (req, res, next) => {
  try {
    const { title, category, deadline } = req.body;

    // id='new' means goal doesn't exist yet — use body data only
    let goalTitle = title;
    let goalCategory = category;

    if (req.params.id !== 'new') {
      const goal = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.user.id } });
      if (!goal) return res.status(404).json({ error: 'Goal not found' });
      goalTitle = title || goal.title;
      goalCategory = category || goal.category;
    }

    if (!goalTitle || !goalCategory) {
      return res.status(400).json({ error: 'title and category are required' });
    }

    const prompt = `Genera exactamente 4 o 5 hitos (milestones) concretos y progresivos para esta meta personal:
Meta: "${goalTitle}"
Categoría: ${goalCategory}
${deadline ? `Fecha límite: ${new Date(deadline).toLocaleDateString('es-ES')}` : ''}

Reglas:
- Los hitos deben ser acciones concretas y medibles, no consejos genéricos
- Deben estar ordenados de más fácil a más difícil
- Los pesos (weight) deben sumar exactamente 100
- Responde SOLO JSON válido, sin markdown:
[{"title":"...","weight":25},{"title":"...","weight":25},{"title":"...","weight":25},{"title":"...","weight":25}]`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        max_tokens: 400,
        temperature: 0.4,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const raw = response.data.choices[0].message.content
      .trim()
      .replace(/^```[a-z]*\n?/i, '')
      .replace(/```$/, '')
      .trim();

    const milestones = JSON.parse(raw);

    // Normalizar pesos para que sumen exactamente 100
    const totalWeight = milestones.reduce((s, m) => s + (m.weight || 0), 0);
    const normalized = milestones.map((m, i) => ({
      title: m.title,
      weight: i === milestones.length - 1
        ? 100 - milestones.slice(0, -1).reduce((s, x) => s + Math.round((x.weight / totalWeight) * 100), 0)
        : Math.round((m.weight / totalWeight) * 100),
      order: i,
    }));

    res.json({ milestones: normalized });
  } catch (err) {
    console.error('Milestone suggest error:', err.message);
    // Fallback genérico si Groq falla
    res.json({
      milestones: [
        { title: 'Primer paso: establecer base', weight: 20, order: 0 },
        { title: 'Alcanzar 25% del objetivo',    weight: 20, order: 1 },
        { title: 'Alcanzar 50% del objetivo',    weight: 20, order: 2 },
        { title: 'Alcanzar 75% del objetivo',    weight: 20, order: 3 },
        { title: 'Meta completada al 100%',      weight: 20, order: 4 },
      ],
    });
  }
});

/* ─── PATCH /api/goals/:id/reactivate ───────────────────────────── */
router.patch('/:id/reactivate', authenticate, async (req, res, next) => {
  try {
    const goal = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    await prisma.milestone.updateMany({
      where: { goalId: req.params.id },
      data: { completed: false, completedAt: null },
    });

    const updated = await prisma.goal.update({
      where: { id: req.params.id },
      data: { status: 'active', currentValue: 0 },
      include: { milestones: { orderBy: { order: 'asc' } } },
    });

    res.json({ goal: { ...updated, progressPercent: 0 } });
  } catch (err) {
    next(err);
  }
});

/* ─── POST /api/goals/:id/milestones ─────────────────────────────── */
router.post('/:id/milestones', authenticate, async (req, res, next) => {
  try {
    const goal = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const { title, weight, order } = req.body;
    const milestone = await prisma.milestone.create({
      data: { goalId: req.params.id, title, weight: weight || 20, order: order || 0 },
    });

    res.status(201).json({ milestone });
  } catch (err) {
    next(err);
  }
});

/* ─── PATCH /api/goals/:id/milestones/:mid ───────────────────────── */
router.patch('/:id/milestones/:mid', authenticate, async (req, res, next) => {
  try {
    const goal = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const milestone = await prisma.milestone.findFirst({
      where: { id: req.params.mid, goalId: req.params.id },
    });
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

    const nowCompleted = !milestone.completed;
    await prisma.milestone.update({
      where: { id: req.params.mid },
      data: {
        completed: nowCompleted,
        completedAt: nowCompleted ? new Date() : null,
      },
    });

    const updatedGoal = await recalcGoalProgress(req.params.id);
    const justCompleted = updatedGoal.status === 'completed' && goal.status !== 'completed';

    if (justCompleted) {
      await rpg.awardXP(req.user.id, 'habits', 100, prisma);
      await rpg.updateCombo(req.user.id, 'habits', prisma);
      await rpg.checkAndUpdateStreak(req.user.id, prisma);
    }

    res.json({ goal: updatedGoal, justCompleted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
