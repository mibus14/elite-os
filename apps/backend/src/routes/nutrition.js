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

const DAILY_GOALS = {
  calories: 2500,
  protein: 180,
  carbs: 280,
  fat: 75,
  fiber: 30,
};

// GET /api/nutrition/today
router.get('/today', authenticate, async (req, res, next) => {
  try {
    const today = startOfDay(new Date());
    const meals = await prisma.meal.findMany({
      where: { userId: req.user.id, date: today },
      orderBy: { mealType: 'asc' },
    });

    const totals = meals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
        fiber: acc.fiber + m.fiber,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );

    res.json({ meals, totals, goals: DAILY_GOALS });
  } catch (err) {
    next(err);
  }
});

// POST /api/nutrition/meals
router.post(
  '/meals',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Meal name required'),
    body('mealType').isIn(['breakfast', 'lunch', 'dinner', 'snack']).withMessage('Invalid meal type'),
    body('calories').isInt({ min: 0 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, mealType, calories, protein, carbs, fat, fiber, date } = req.body;

      const meal = await prisma.meal.create({
        data: {
          userId: req.user.id,
          date: date ? startOfDay(new Date(date)) : startOfDay(new Date()),
          mealType,
          name,
          calories: parseInt(calories) || 0,
          protein: parseFloat(protein) || 0,
          carbs: parseFloat(carbs) || 0,
          fat: parseFloat(fat) || 0,
          fiber: parseFloat(fiber) || 0,
        },
      });

      await rpg.awardXP(req.user.id, 'nutrition', 20, prisma);
      await rpg.updateCombo(req.user.id, 'nutrition', prisma);
      await rpg.checkAndUpdateStreak(req.user.id, prisma);
      res.status(201).json({ meal });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/nutrition/meals/:id
router.delete('/meals/:id', authenticate, async (req, res, next) => {
  try {
    const meal = await prisma.meal.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!meal) return res.status(404).json({ error: 'Meal not found' });

    await prisma.meal.delete({ where: { id: req.params.id } });
    res.json({ message: 'Meal deleted' });
  } catch (err) {
    next(err);
  }
});

// GET /api/nutrition/stats/weekly
router.get('/stats/weekly', authenticate, async (req, res, next) => {
  try {
    const today = startOfDay(new Date());
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d);
    }

    const stats = await Promise.all(
      days.map(async (day) => {
        const agg = await prisma.meal.aggregate({
          where: { userId: req.user.id, date: day },
          _sum: { calories: true, protein: true, carbs: true, fat: true, fiber: true },
        });
        return {
          date: day.toISOString().slice(0, 10),
          calories: agg._sum.calories || 0,
          protein: agg._sum.protein || 0,
          carbs: agg._sum.carbs || 0,
          fat: agg._sum.fat || 0,
          fiber: agg._sum.fiber || 0,
        };
      })
    );

    res.json({ stats, goals: DAILY_GOALS });
  } catch (err) {
    next(err);
  }
});

// GET /api/nutrition/goals
router.get('/goals', authenticate, async (req, res) => {
  res.json({ goals: DAILY_GOALS });
});

module.exports = router;
