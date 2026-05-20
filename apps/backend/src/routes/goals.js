const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/goals
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, category } = req.query;
    const where = { userId: req.user.id };
    if (status) where.status = status;
    if (category) where.category = category;

    const goals = await prisma.goal.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
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

// POST /api/goals
router.post(
  '/',
  authenticate,
  [
    body('title').trim().notEmpty().withMessage('Title required'),
    body('category').notEmpty().withMessage('Category required'),
    body('targetValue').isFloat({ min: 0 }).withMessage('Target value required'),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('status').optional().isIn(['active', 'completed', 'paused', 'cancelled']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { title, description, category, targetValue, currentValue, unit, deadline, status, priority } =
        req.body;

      const goal = await prisma.goal.create({
        data: {
          userId: req.user.id,
          title,
          description: description || null,
          category,
          targetValue: parseFloat(targetValue),
          currentValue: parseFloat(currentValue) || 0,
          unit: unit || null,
          deadline: deadline ? new Date(deadline) : null,
          status: status || 'active',
          priority: priority || 'medium',
        },
      });

      res.status(201).json({ goal });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/goals/:id
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const goal = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const { title, description, category, targetValue, currentValue, unit, deadline, status, priority } =
      req.body;

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
    });

    res.json({ goal: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/goals/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const goal = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    await prisma.goal.delete({ where: { id: req.params.id } });
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/goals/:id/progress
router.post(
  '/:id/progress',
  authenticate,
  [body('value').isFloat({ min: 0 }).withMessage('Progress value required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const goal = await prisma.goal.findFirst({
        where: { id: req.params.id, userId: req.user.id },
      });
      if (!goal) return res.status(404).json({ error: 'Goal not found' });

      const newValue = parseFloat(req.body.value);
      const autoComplete = req.body.autoComplete !== false;

      const updated = await prisma.goal.update({
        where: { id: req.params.id },
        data: {
          currentValue: newValue,
          status:
            autoComplete && newValue >= goal.targetValue && goal.status === 'active'
              ? 'completed'
              : goal.status,
        },
      });

      res.json({
        goal: updated,
        progressPercent: Math.min(100, Math.round((updated.currentValue / updated.targetValue) * 100)),
        justCompleted: updated.status === 'completed' && goal.status !== 'completed',
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
