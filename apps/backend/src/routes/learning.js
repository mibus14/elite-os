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

/* ─── POST /api/learning/generate ───────────────────────────────── */
router.post('/generate', authenticate, async (req, res, next) => {
  try {
    const { interests } = req.body;
    if (!Array.isArray(interests) || interests.length === 0)
      return res.status(400).json({ error: 'interests required' });

    const prompt = `Tengo estos intereses de aprendizaje: ${interests.join(', ')}.
Genera exactamente 3 sugerencias concretas de cosas para aprender por cada interés.
Cada sugerencia debe ser específica y accionable (no genérica).
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
          temperature: 0.5,
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

      // Extract JSON array robustly — find the first [...] block in the response
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('No JSON array in response: ' + content.slice(0, 100));
      suggestions = JSON.parse(match[0]);

      if (!Array.isArray(suggestions) || suggestions.length === 0)
        throw new Error('Empty suggestions array');
    } catch (aiErr) {
      console.error('[Learning] Groq AI error:', aiErr.message);
      // Fallback: generate static suggestions so the user always gets something
      suggestions = interests.flatMap((interest) => [
        { tag: interest, title: `Fundamentos esenciales de ${interest}` },
        { tag: interest, title: `Proyecto práctico: aplica ${interest} desde cero` },
        { tag: interest, title: `${interest} avanzado: mejores prácticas y casos reales` },
      ]);
    }

    const created = await prisma.learningItem.createMany({
      data: suggestions.map((s) => ({
        userId: req.user.id,
        tag: s.tag,
        title: s.title,
      })),
    });

    const items = await prisma.learningItem.findMany({
      where: { userId: req.user.id },
      orderBy: [{ completed: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ items, generated: created.count });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
