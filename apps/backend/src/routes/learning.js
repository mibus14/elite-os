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

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        max_tokens: 600,
        temperature: 0.6,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 12000,
      }
    );

    const raw = response.data.choices[0].message.content
      .trim()
      .replace(/^```[a-z]*\n?/i, '')
      .replace(/```$/, '')
      .trim();

    const suggestions = JSON.parse(raw);

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
    console.error('Generate error:', err.message);
    next(err);
  }
});

module.exports = router;
