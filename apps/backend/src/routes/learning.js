const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');
const axios = require('axios');
const rpg = require('../lib/rpg');

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

/* ─── DELETE /api/learning/items/:id ────────────────────────────── */
router.delete('/items/:id', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.learningItem.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    await prisma.learningItem.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
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
    let xpAwarded = 0;
    if (nowDone) {
      const { finalXP } = await rpg.awardXP(req.user.id, 'learning', 30, prisma);
      xpAwarded = finalXP;
      await rpg.updateCombo(req.user.id, 'learning', prisma);
      await rpg.checkAndUpdateStreak(req.user.id, prisma);
    }
    res.json({ item: updated, xpAwarded });
  } catch (err) { next(err); }
});

/* ─── Fallback suggestion pool ───────────────────────────────────── */
// Varied, topic-specific fallbacks when AI is unavailable
const FALLBACK_SPECIFIC = {
  // Dev / tech
  python:        ['Automatización de tareas con Python: scripts para tu día a día', 'Análisis de datos con pandas y matplotlib desde cero', 'Construye una API REST con FastAPI y despliégala'],
  javascript:    ['Event loop y asincronía en JS: Promises, async/await', 'Construye una SPA con Vanilla JS sin frameworks', 'Patrones de diseño en JavaScript: module, observer, factory'],
  react:         ['Estado global con Zustand vs Redux: cuándo usar cada uno', 'React Query para manejo de datos remotos en apps reales', 'Optimización de renders: memo, useMemo, useCallback'],
  typescript:    ['Tipos genéricos en TypeScript: guía práctica', 'Migrando un proyecto JS a TS: estrategia paso a paso', 'Utility types avanzados: Partial, Required, Pick, Omit'],
  sql:           ['JOINs explicados: INNER, LEFT, RIGHT, FULL con ejemplos reales', 'Optimización de queries: índices, EXPLAIN y performance', 'Diseño de esquemas: normalización y sus excepciones'],
  docker:        ['Construye tu primer Dockerfile y docker-compose', 'Orquestación con Docker Swarm vs Kubernetes: diferencias', 'Redes y volúmenes en Docker: guía de supervivencia'],
  git:           ['Git avanzado: rebase interactivo, cherry-pick y bisect', 'Estrategias de branching: Git Flow vs Trunk Based', 'Resuelve conflictos de merge como un profesional'],
  // Fitness / salud
  gym:           ['Periodización de entrenamiento: cómo planear mesociclos', 'Los 5 patrones de movimiento que debes dominar', 'Técnica del peso muerto rumano desde cero'],
  nutricion:     ['Cálculo de macros para tu objetivo: corte o volumen', 'Meal prep efectivo: 5 recetas altas en proteína', 'Suplementación basada en evidencia: qué sí y qué no'],
  meditacion:    ['Meditación Vipassana: 10 minutos diarios durante 30 días', 'Body scan para reducir estrés: técnica paso a paso', 'Diferencias entre mindfulness, meditación y concentración'],
  // Negocios / finanzas
  finanzas:      ['Presupuesto personal con el método 50/30/20', 'Inversión indexada: ETFs y fondos para principiantes', 'Cómo leer un estado financiero en 30 minutos'],
  marketing:     ['Embudo de conversión: TOFU, MOFU y BOFU explicados', 'Google Ads desde cero: campaña de búsqueda con presupuesto bajo', 'Copywriting persuasivo: las 6 fórmulas que funcionan'],
  ventas:        ['SPIN Selling: cómo hacer preguntas que cierran ventas', 'Manejo de objeciones: las 5 más comunes y cómo responderlas', 'CRM en la práctica: Pipeline y seguimiento de leads'],
  // Idiomas
  ingles:        ['Phrasal verbs esenciales para contextos de trabajo', 'Técnica de shadowing para mejorar pronunciación', 'Business English: emails, reuniones y presentaciones'],
  japones:       ['Hiragana y Katakana en 2 semanas: método de trazos', 'Las 100 palabras más usadas en japonés cotidiano', 'Genki I: estructura de estudio capítulo a capítulo'],
};

function pickFallback(interest) {
  const key = interest.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g,'');
  const match = Object.entries(FALLBACK_SPECIFIC).find(([k]) => key.includes(k));
  if (match) {
    const titles = match[1].sort(() => Math.random() - 0.5).slice(0, 3);
    return titles.map((title) => ({ tag: interest, title }));
  }
  // Generic fallback with varied types
  const generic = [
    `${interest}: proyecto práctico de nivel principiante a intermedio`,
    `Los conceptos que más se usan en ${interest} en el mundo real`,
    `Hoja de ruta para dominar ${interest} en 3 meses`,
    `${interest} explicado con ejemplos aplicados`,
    `Los errores más comunes aprendiendo ${interest} y cómo evitarlos`,
    `Recursos y comunidades top para aprender ${interest}`,
  ].sort(() => Math.random() - 0.5).slice(0, 3);
  return generic.map((title) => ({ tag: interest, title }));
}

const GENERATE_SYSTEM = `Eres un tutor experto en aprendizaje. Generas sugerencias ULTRA-ESPECÍFICAS: cada título debe nombrar el subtema exacto, la técnica con nombre propio, el proyecto con herramienta real, o el ejercicio concreto.

REGLAS:
1. Nunca digas "Fundamentos de X", "Aprende X", "Introducción a X" — SIEMPRE especifica QUÉ dentro de X
2. Para matemáticas/ciencias: nombra el teorema, método o tipo de ejercicio exacto
3. Para programación: nombra la librería, patrón de diseño, o proyecto con stack específico
4. Para idiomas: nombra la estructura gramatical, tipo de vocabulario o método con nombre real
5. Para fitness/deporte: nombra el ejercicio, protocolo, o método exacto con nombre propio
6. Para negocios/finanzas: nombra el modelo, framework o caso de uso específico
7. Varía el tipo: 1 ejercicio/práctica concreta, 1 concepto técnico puntual, 1 proyecto o aplicación real

EJEMPLOS POR CATEGORÍA:

"álgebra lineal" →
- "Multiplicación de matrices y cálculo del determinante: 20 ejercicios resueltos paso a paso"
- "Eigenvectores y eigenvalores: interpretación geométrica y cálculo para transformaciones lineales"
- "Eliminación Gaussiana y Gauss-Jordan: resolución de sistemas 3x3 con casos especiales"

"Python" →
- "Decoradores en Python: @property, @staticmethod, @classmethod y decoradores propios con functools.wraps"
- "Scraping con BeautifulSoup4 y Requests: extrae datos de tablas HTML y exporta a CSV"
- "AsyncIO en Python: event loop, coroutines, gather() y manejo de tareas concurrentes"

"inglés" →
- "Reported speech: transformación de afirmaciones, preguntas y órdenes con backshifting"
- "Phrasal verbs para negocios: 30 verbos frasales esenciales con contexto y ejemplos reales"
- "Método shadowing con podcasts: técnica de imitación para mejorar entonación y fluidez"

"gym" →
- "Romanian Deadlift: técnica de bisagra de cadera, posición de barra y progresión de carga"
- "Periodización ondulante diaria (DUP): diseño de semana con días de fuerza, potencia e hipertrofia"
- "Sentadilla búlgara con barra: setup, balance y programación para cuádriceps unilateral"

"finanzas personales" →
- "Método de la avalancha de deudas: cálculo de interés compuesto y orden óptimo de pago"
- "ETFs vs fondos indexados: comparación de TER, tracking error y fiscalidad para inversión pasiva"
- "Estado de flujo de caja personal: plantilla mensual con categorías y análisis de ahorro real"

Responde ÚNICAMENTE con JSON válido en una sola línea, sin markdown, sin explicaciones:
[{"tag":"nombre del interés","title":"sugerencia ultra-específica"},...]`;

/* ─── POST /api/learning/generate — devuelve preview sin guardar ─── */
router.post('/generate', authenticate, async (req, res, next) => {
  try {
    const { interests, customTopic, excludeTitles = [], variationSeed = 0 } = req.body;

    // customTopic overrides interests for this generation
    let topics;
    if (customTopic && typeof customTopic === 'string' && customTopic.trim()) {
      topics = [customTopic.trim()];
    } else {
      if (!Array.isArray(interests) || interests.length === 0)
        return res.status(400).json({ error: 'interests required' });
      const expanded = interests.flatMap((i) =>
        i.split(',').map((s) => s.trim()).filter(Boolean)
      );
      topics = [...new Set(expanded)];
    }

    // Build exclusion block for the prompt
    const excluded = Array.isArray(excludeTitles) ? excludeTitles.slice(0, 30) : [];
    const exclusionBlock = excluded.length > 0
      ? `\n\nEVITA ESTAS (ya las conoce el usuario, NO las repitas ni generes algo similar):\n${excluded.map(t => `- ${t}`).join('\n')}`
      : '';

    // Increase temperature with each regeneration for more variety
    const temperature = Math.min(0.95, 0.75 + variationSeed * 0.05);

    const countPerTopic = 3;
    const prompt = `Temas: ${topics.map((i) => `"${i}"`).join(', ')}.

Para CADA tema genera exactamente ${countPerTopic} sugerencias DISTINTAS y ULTRA-ESPECÍFICAS.
- Cada título nombra subtema exacto, método con nombre propio, o proyecto con herramienta real.
- VARIACIÓN REQUERIDA (intento #${variationSeed + 1}): genera sugerencias que NUNCA se solapen con las anteriores. Cambia el ángulo, nivel, herramienta o aplicación.
- Mezcla: práctica concreta, concepto técnico avanzado, proyecto aplicado.
Total de objetos: ${topics.length * countPerTopic}.${exclusionBlock}

Responde ÚNICAMENTE con el array JSON en una línea. Sin texto extra, sin markdown.`;

    let suggestions;
    try {
      if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          max_tokens: topics.length * 500,
          temperature,
          messages: [
            { role: 'system', content: GENERATE_SYSTEM },
            { role: 'user',   content: prompt },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        }
      );

      const content = response.data.choices[0].message.content.trim();
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('No JSON array in response');
      suggestions = JSON.parse(match[0]);
      if (!Array.isArray(suggestions) || suggestions.length === 0)
        throw new Error('Empty suggestions array');

      suggestions = suggestions.map((s) => ({
        tag:   s.tag   || topics[0],
        title: s.title || String(s),
      }));

      // Filter out any exact matches with excluded titles (safety net)
      const excludedSet = new Set(excluded.map(t => t.toLowerCase()));
      suggestions = suggestions.filter(s => !excludedSet.has(s.title.toLowerCase()));

    } catch (aiErr) {
      console.error('[Learning] Groq AI error:', aiErr.message);
      suggestions = topics.flatMap((interest) => pickFallback(interest));
    }

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

/* ─── Sistema de estudio (lección completa) ──────────────────────── */
const STUDY_SYSTEM = `Eres el mejor tutor del mundo: riguroso, específico y práctico. Generas lecciones completas sobre cualquier tema.

Responde ÚNICAMENTE con este JSON en una sola línea (sin markdown exterior, sin texto extra):
{
  "topic": "nombre exacto y específico del tema estudiado",
  "summary": "2 oraciones: QUÉ es el tema y POR QUÉ importa dominarlo",
  "keyPoints": ["concepto clave 1 con nombre propio", "concepto clave 2", "concepto clave 3", "concepto clave 4", "concepto clave 5"],
  "explanation": "explicación completa en 3-5 párrafos técnicos y profundos. Usa nombres propios de métodos, librerías, técnicas. Cada párrafo separado por \\n\\n. Nada genérico.",
  "hasCode": true,
  "codeExample": "código real y ejecutable con comentarios explicativos, o null si no aplica",
  "codeLanguage": "python|javascript|typescript|sql|bash|java|go|rust|html|css|null",
  "steps": ["paso 1 concreto con detalle", "paso 2", "paso 3"],
  "exercises": [
    { "question": "ejercicio práctico concreto 1", "answer": "respuesta completa y detallada", "hint": "pista útil sin dar la respuesta" },
    { "question": "ejercicio 2 más difícil", "answer": "respuesta", "hint": "pista" },
    { "question": "ejercicio 3 aplicación real", "answer": "respuesta", "hint": "pista" }
  ],
  "nextTopics": ["subtema avanzado específico 1", "aplicación práctica del tema 2", "concepto relacionado que lo complementa 3"]
}

REGLAS CRÍTICAS:
- keyPoints: 5-8 puntos, cada uno nombra un concepto/método/herramienta REAL con nombre propio
- explanation: profundidad técnica real, usa terminología correcta, ejemplos dentro del texto
- codeExample: si el tema es programación/matemáticas/data/shell → código REAL que funciona; si es fitness/idiomas/negocios → null
- steps: si es un proceso (fitness, idiomas, negocios, método) → 4-7 pasos prácticos detallados; si ya hay código → []
- exercises: 3-5 ejercicios graduados de fácil a difícil. Las respuestas deben ser COMPLETAS y educativas
- nextTopics: 3 temas que el usuario debería estudiar a continuación para profundizar
- Adapta el nivel según el campo 'level': beginner=conceptos base con analogías, intermediate=profundidad técnica, advanced=edge cases y optimizaciones
- Todo en español excepto términos técnicos internacionales (Python, Docker, etc.)
- NUNCA uses frases genéricas como "es importante", "hay que recordar", "como mencionamos"`;

/* ─── POST /api/learning/study — genera lección completa ─────────── */
router.post('/study', authenticate, async (req, res, next) => {
  try {
    const { topic, level = 'intermediate' } = req.body;
    if (!topic || typeof topic !== 'string' || !topic.trim())
      return res.status(400).json({ error: 'topic required' });

    if (!process.env.GROQ_API_KEY)
      return res.status(503).json({ error: 'AI no configurada' });

    const levelLabel = {
      beginner:     'Principiante (explica conceptos base con analogías, evita jerga excesiva)',
      intermediate: 'Intermedio (profundidad técnica, asume conocimientos básicos)',
      advanced:     'Avanzado (edge cases, optimización, patrones expertos, profundidad máxima)',
    }[level] || 'Intermedio';

    const userPrompt = `Tema: "${topic.trim()}"
Nivel: ${levelLabel}

Genera la lección completa según el sistema. Sé ultra-específico y práctico.`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model:       'llama-3.3-70b-versatile',
        max_tokens:  2500,
        temperature: 0.55,
        messages: [
          { role: 'system', content: STUDY_SYSTEM },
          { role: 'user',   content: userPrompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 55000,
      }
    );

    const raw = response.data.choices[0].message.content.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');

    let lesson;
    try {
      lesson = JSON.parse(match[0]);
    } catch {
      // Try to recover from truncated JSON
      throw new Error('JSON parse failed');
    }

    // Sanitize fields
    lesson.topic        = lesson.topic        || topic;
    lesson.summary      = lesson.summary      || '';
    lesson.keyPoints    = Array.isArray(lesson.keyPoints)  ? lesson.keyPoints  : [];
    lesson.explanation  = lesson.explanation  || '';
    lesson.codeExample  = lesson.codeExample  || null;
    lesson.codeLanguage = lesson.codeLanguage || null;
    lesson.steps        = Array.isArray(lesson.steps)      ? lesson.steps      : [];
    lesson.exercises    = Array.isArray(lesson.exercises)  ? lesson.exercises  : [];
    lesson.nextTopics   = Array.isArray(lesson.nextTopics) ? lesson.nextTopics : [];

    res.json({ lesson });
  } catch (err) {
    console.error('[Learning/study] Error:', err.message);
    next(err);
  }
});

module.exports = router;
