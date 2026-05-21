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

/* ─── Lookup local (fallback sin API) ───────────────────────────── */
// Each entry: [keywords[], calories_per_serving, servingNote]
const FOOD_DB = [
  // Agua / sin calorías
  [['agua','water','te sin','cafe negro','cafe solo','mineral','sparkling'],0,''],
  // Mexicana
  [['taco de bistec','taco bistec'],230,'c/u'],[['taco de pollo','taco pollo'],190,'c/u'],
  [['taco de carnitas','taco carnitas'],210,'c/u'],[['taco de barbacoa'],220,'c/u'],
  [['taco de pastor','taco al pastor'],200,'c/u'],[['taco de suadero'],215,'c/u'],
  [['taco'],180,'c/u'],[['quesadilla de pollo'],380,''],[['quesadilla'],330,''],
  [['torta de jamon','torta jamon'],430,''],[['torta de milanesa'],600,''],
  [['torta cubana'],750,''],[['torta'],510,''],[['tamal de rajas'],280,'c/u'],
  [['tamal de pollo'],300,'c/u'],[['tamal'],270,'c/u'],
  [['enchilada'],180,'c/u'],[['sopa de fideo'],220,''],[['sopa de lima'],180,''],
  [['sopa de lentejas','lentejas'],200,''],[['pozole'],350,'plato'],
  [['caldo de pollo'],150,''],[['caldo de res'],180,''],
  [['arroz blanco','arroz'],180,'taza'],[['frijoles de olla','frijoles'],150,'taza'],
  [['frijoles refritos'],200,'taza'],[['tamales'],270,'c/u'],
  [['chilaquiles'],380,''],[['huevos rancheros'],320,''],
  [['huevo revuelto','huevos revueltos'],200,'2 huevos'],
  [['huevo estrellado','huevo frito'],180,'c/u'],[['omelette','omelet'],250,''],
  [['molletes'],380,''],[['pambazo'],480,''],
  [['tostada'],220,'c/u'],[['gordita'],280,'c/u'],[['sope'],250,'c/u'],
  [['tlayuda'],550,''],[['birria'],380,'plato'],
  [['menudo'],280,'tazón'],[['flautas'],200,'2 pzas'],
  [['milanesa de pollo','pollo milanesa'],380,''],
  [['milanesa de res','res milanesa'],420,''],
  [['pollo asado','pechuga asada'],280,''],[['pollo frito'],400,''],
  [['carne asada'],350,''],
  // Comida rápida
  [['hamburguesa doble','double burger'],620,''],[['hamburguesa'],450,''],
  [['pizza rebanada','slice pizza','rebanada de pizza'],280,'rebanada'],
  [['pizza'],800,'1/4'],[['hot dog','hotdog'],310,''],
  [['papas fritas','french fries'],370,'porción'],
  [['nuggets'],300,'6 pzas'],[['alitas'],400,'6 pzas'],
  [['sandwich'],380,''],[['wrap'],420,''],
  // Proteínas
  [['pechuga de pollo','chicken breast'],165,'100g'],
  [['atun en lata','atun'],130,'lata 140g'],[['salmon'],180,'100g'],
  [['carne molida'],250,'100g'],[['bistec'],280,'porción'],
  // Carbohidratos
  [['pan dulce'],280,'c/u'],[['pan tostado','tostada pan'],90,'rebanada'],
  [['tortilla de harina'],120,'c/u'],[['tortilla de maiz'],60,'c/u'],
  [['pasta'],350,'plato'],[['espagueti'],380,''],[['fideos'],200,''],
  // Lácteos
  [['leche entera'],150,'vaso'],[['leche descremada'],90,'vaso'],
  [['yogurt'],120,'pot'],[['queso fresco'],80,'porción'],[['queso'],100,'porción'],
  // Frutas
  [['manzana'],80,'c/u'],[['platano','banana'],105,'c/u'],[['naranja'],60,'c/u'],
  [['mango'],100,'c/u'],[['fresa'],50,'taza'],[['sandía','sandia'],85,'rebanada'],
  [['uvas'],70,'taza'],[['aguacate'],160,'medio'],[['guayaba'],45,'c/u'],
  // Verduras
  [['ensalada cesar'],250,''],  [['ensalada mixta','ensalada'],80,''],
  [['verduras'],50,'porción'],[['brócoli','brocoli'],55,'taza'],
  // Snacks
  [['papas sabritas','sabritas','papas fritas bolsa'],160,'bolsita'],
  [['galletas'],140,'4 pzas'],[['granola'],200,'taza'],[['avena'],150,'taza'],
  [['cereal'],180,'taza'],[['palomitas'],100,'taza'],
  [['chocolate'],170,'barra'],[['helado'],200,'bola'],
  // Bebidas con calorías
  [['jugo de naranja','jugo naranja'],110,'vaso'],[['jugo'],120,'vaso'],
  [['leche con chocolate'],200,'vaso'],[['café con leche','cafe con leche'],80,''],
  [['cappuccino'],120,''],[['latte'],190,''],[['refresco','coca cola','pepsi'],140,'lata'],
  [['cerveza'],150,'lata'],[['vino'],120,'copa'],
  [['proteína','protein shake','licuado proteína'],180,'scoop'],
  [['licuado de frutas','smoothie'],220,''],[['licuado'],250,''],
  // Desayuno
  [['hotcakes','pancakes'],300,'3 pzas'],[['waffles'],350,'2 pzas'],
  [['french toast','pan francés'],280,'2 rebanadas'],
];

function estimateLocal(description) {
  const text = description.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'');

  // Parse leading multiplier: "2 tacos", "3 piezas de"
  const qtyMatch = text.match(/^(\d+(?:\.\d+)?)\s*x?\s*/);
  const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;

  // Find best matching food
  let best = null, bestLen = 0;
  for (const [keywords, cal] of FOOD_DB) {
    for (const kw of keywords) {
      const kwNorm = kw.normalize('NFD').replace(/[̀-ͯ]/g,'');
      if (text.includes(kwNorm) && kwNorm.length > bestLen) {
        best = cal; bestLen = kwNorm.length;
      }
    }
  }

  if (best === null) return { calories: null, confidence: 'low', unknown: true };
  const total = Math.round(best * qty);
  return { calories: total, confidence: qty > 1 ? 'high' : 'medium', unknown: false };
}

/* ─── Estimación calórica con Grok (primaria) + fallback local ───── */
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
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');

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
  const desc = description.trim();
  try {
    const result = await estimateWithAI(desc);
    res.json(result);
  } catch (err) {
    // AI unavailable — fall back to local lookup
    const fallback = estimateLocal(desc);
    res.json(fallback);
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
