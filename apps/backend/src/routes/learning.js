const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');
const axios = require('axios');

const prisma = new PrismaClient();

/* ─── GET /api/learning/interests ───────────────────────────────── */
router.get('/interests', authenticate, async (req, res, next) => {
  try {
    const interests = await prisma.learningInterest.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ interests });
  } catch (err) { next(err); }
});

/* ─── POST /api/learning/interests ──────────────────────────────── */
router.post('/interests', authenticate, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });
    const interest = await prisma.learningInterest.create({
      data: { userId: req.user.id, name: name.trim() },
    });
    res.status(201).json({ interest });
  } catch (err) { next(err); }
});

/* ─── DELETE /api/learning/interests/:id ─────────────────────────── */
router.delete('/interests/:id', authenticate, async (req, res, next) => {
  try {
    const interest = await prisma.learningInterest.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!interest) return res.status(404).json({ error: 'Not found' });
    await prisma.learningInterest.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

/* ─── GET /api/learning/items ────────────────────────────────────── */
router.get('/items', authenticate, async (req, res, next) => {
  try {
    const items = await prisma.learningItem.findMany({
      where: { userId: req.user.id },
      orderBy: [{ completed: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ items });
  } catch (err) { next(err); }
});

/* ─── PATCH /api/learning/items/:id ─────────────────────────────── */
router.patch('/items/:id', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.learningItem.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    const nowDone = !item.completed;
    const updated = await prisma.learningItem.update({
      where: { id: req.params.id },
      data: { completed: nowDone, completedAt: nowDone ? new Date() : null },
    });
    res.json({ item: updated });
  } catch (err) { next(err); }
});

/* ─── Fallback suggestion pool (varied, random) ──────────────────── */
const FALLBACK_TEMPLATES = [
  (i) => `Fundamentos esenciales de ${i}`,
  (i) => `Proyecto práctico desde cero con ${i}`,
  (i) => `${i} avanzado: patrones y mejores prácticas`,
  (i) => `Guía paso a paso para aprender ${i}`,
  (i) => `Los 10 conceptos clave de ${i}`,
  (i) => `Cómo aplicar ${i} en proyectos reales`,
  (i) => `Errores comunes en ${i} y cómo evitarlos`,
  (i) => `De cero a intermedio en ${i}: hoja de ruta`,
  (i) => `${i} en la práctica: ejercicios y retos`,
  (i) => `Recursos esenciales para dominar ${i}`,
  (i) => `${i} para principiantes: primer proyecto real`,
  (i) => `Teoría que todo experto en ${i} conoce`,
  (i) => `${i}: comparativa de herramientas y enfoques`,
  (i) => `30 días de ${i}: plan de estudio intensivo`,
  (i) => `Casos de uso reales donde brilla ${i}`,
];

function pickFallback(interest) {
  const shuffled = [...FALLBACK_TEMPLATES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map((fn) => ({ tag: interest, title: fn(interest) }));
}

/* ─── POST /api/learning/generate — devuelve preview sin guardar ─── */
router.post('/generate', authenticate, async (req, res, next) => {
  try {
    const { interests } = req.body;
    if (!Array.isArray(interests) || interests.length === 0)
      return res.status(400).json({ error: 'interests required' });

    const prompt = `Tengo estos intereses de aprendizaje: ${interests.join(', ')}.
Genera exactamente 3 sugerencias concretas y diferentes de cosas para aprender por cada interés.
Cada sugerencia debe ser específica y accionable (no genérica). Varía el tipo: tutoriales, proyectos, conceptos teóricos, etc.
Responde SOLO JSON válido, sin markdown:
[{"tag":"interés","title":"sugerencia"},...]
Genera ${interests.length * 3} objetos en total.`;

    let suggestions;
    try {
      if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          max_tokens: 800,
          temperature: 0.9,
          messages: [
            {
              role: 'system',
              content: 'Eres un asistente que responde ÚNICAMENTE con JSON válido. Nunca agregues markdown, explicaciones ni texto fuera del JSON.',
            },
            { role: 'user', content: prompt },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const content = response.data.choices[0].message.content.trim();
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('No JSON array in response');
      suggestions = JSON.parse(match[0]);
      if (!Array.isArray(suggestions) || suggestions.length === 0)
        throw new Error('Empty suggestions array');
    } catch (aiErr) {
      console.error('[Learning] Groq AI error:', aiErr.message);
      suggestions = interests.flatMap((interest) => pickFallback(interest));
    }

    // Return suggestions as preview — NOT saved to DB yet
    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

/* ─── POST /api/learning/items/bulk — guarda sugerencias elegidas ── */
router.post('/items/bulk', authenticate, async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'items required' });

    await prisma.learningItem.createMany({
      data: items.map((s) => ({
        userId: req.user.id,
        tag: String(s.tag).slice(0, 100),
        title: String(s.title).slice(0, 500),
      })),
    });

    const all = await prisma.learningItem.findMany({
      where: { userId: req.user.id },
      orderBy: [{ completed: 'asc' }, { createdAt: 'desc' }],
    });

    res.status(201).json({ items: all });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
