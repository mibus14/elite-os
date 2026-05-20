const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');
const rpg = require('../lib/rpg');
const axios = require('axios');

const prisma = new PrismaClient();

function startOfDay(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

const DAILY_GOALS = {
  calories: 2200,
  protein: 160,
  carbs: 280,
  fat: 75,
  fiber: 30,
};

/* ─── Estimación calórica con Grok ───────────────────────────────── */
const SYSTEM_PROMPT = `Eres un experto en nutrición especializado en comida mexicana y latinoamericana. Estima las calorías totales de lo que el usuario describe.

Reglas importantes:
- Agua, té sin azúcar, café negro, agua mineral = 0 calorías siempre
- Si no reconoces el alimento o la descripción es incomprensible, usa calories=null
- Porciones típicas: plato hondo=350ml, taza=240ml, vaso=250ml, porción normal de adulto
- Si el texto incluye cantidad exacta (500ml, 2 tacos, 300g), úsala. Si no, asume una porción normal

Responde ÚNICAMENTE con JSON en una sola línea, sin markdown ni texto extra:
{"calories":NUMERO_O_null,"confidence":"high|medium|low"}

confidence: high=cantidad explícita, medium=porción inferida, low=alimento desconocido o descripción vaga.`;

async function estimateWithAI(description) {
  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      max_tokens: 60,
      temperature: 0.1,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: description },
      ],
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 8000,
    }
  );

  const raw = response.data.choices[0].message.content
    .trim()
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/```$/, '')
    .trim();
  const parsed = JSON.parse(raw);
  const cal = parsed.calories === null || parsed.calories === undefined
    ? null
    : Math.max(parseInt(parsed.calories), 0);
  return {
    calories: cal,
    confidence: parsed.confidence || 'medium',
    unknown: cal === null,
  };
}

/* ─── Routes ─────────────────────────────────────────────────────── */

// POST /api/nutrition/estimate
router.post('/estimate', authenticate, async (req, res) => {
  const { description } = req.body;
  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'description required' });
  }
  try {
    const result = await estimateWithAI(description.trim());
    res.json(result);
  } catch (err) {
    console.error('AI estimate failed:', err.message);
    res.json({ calories: null, confidence: 'low', unknown: true });
  }
});

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

    const byCategory = meals.reduce(
      (acc, m) => {
        const cat = m.category || 'HEALTHY';
        acc[cat] = (acc[cat] || 0) + m.calories;
        return acc;
      },
      { BAD: 0, HOMEMADE_CAL: 0, HEALTHY: 0 }
    );

    res.json({ meals, totals, byCategory, goals: DAILY_GOALS });
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

      const { name, mealType, calories, protein, carbs, fat, fiber, date, category } = req.body;

      const VALID_CATEGORIES = ['BAD', 'HOMEMADE_CAL', 'HEALTHY'];
      const safeCategory = VALID_CATEGORIES.includes(category) ? category : 'HEALTHY';

      const meal = await prisma.meal.create({
        data: {
          userId: req.user.id,
          date: date ? startOfDay(new Date(date)) : startOfDay(new Date()),
          mealType,
          name,
          category: safeCategory,
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
        const meals = await prisma.meal.findMany({
          where: { userId: req.user.id, date: day },
          select: { calories: true, category: true },
        });
        const total = meals.reduce((s, m) => s + m.calories, 0);
        const bad   = meals.filter((m) => m.category === 'BAD').reduce((s, m) => s + m.calories, 0);
        const home  = meals.filter((m) => m.category === 'HOMEMADE_CAL').reduce((s, m) => s + m.calories, 0);
        const good  = meals.filter((m) => m.category === 'HEALTHY').reduce((s, m) => s + m.calories, 0);
        return {
          date: day.toISOString().slice(0, 10),
          calories: total,
          bad,
          home,
          good,
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
