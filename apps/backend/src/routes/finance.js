const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');
const rpg = require('../lib/rpg');

const prisma = new PrismaClient();

function startOfDay(d) {
  const dt = new Date(d);
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

// GET /api/finance/entries
router.get('/entries', authenticate, async (req, res, next) => {
  try {
    const { month, year, type, limit = 50, offset = 0 } = req.query;

    const where = { userId: req.user.id };

    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0);
      where.date = { gte: start, lte: end };
    }
    if (type) where.type = type;

    const entries = await prisma.financeEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.financeEntry.count({ where });
    res.json({ entries, total });
  } catch (err) {
    next(err);
  }
});

// POST /api/finance/entries
router.post(
  '/entries',
  authenticate,
  [
    body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('category').trim().notEmpty().withMessage('Category required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { type, category, amount, description, date } = req.body;

      const entry = await prisma.financeEntry.create({
        data: {
          userId: req.user.id,
          date: date ? startOfDay(new Date(date)) : startOfDay(new Date()),
          type,
          category,
          amount: parseFloat(amount),
          description: description || null,
        },
      });

      await rpg.awardXP(req.user.id, 'finance', 30, prisma);
      await rpg.updateCombo(req.user.id, 'finance', prisma);
      await rpg.checkAndUpdateStreak(req.user.id, prisma);
      res.status(201).json({ entry });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/finance/entries/:id
router.delete('/entries/:id', authenticate, async (req, res, next) => {
  try {
    const entry = await prisma.financeEntry.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    await prisma.financeEntry.delete({ where: { id: req.params.id } });
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    next(err);
  }
});

// GET /api/finance/summary
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Last 6 months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const sixMonthsEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    sixMonthsEnd.setHours(23, 59, 59, 999);

    const [incomeRows, expenseRows] = await Promise.all([
      prisma.financeEntry.findMany({
        where: { userId, type: 'income', date: { gte: sixMonthsAgo, lte: sixMonthsEnd } },
        select: { date: true, amount: true },
      }),
      prisma.financeEntry.findMany({
        where: { userId, type: 'expense', date: { gte: sixMonthsAgo, lte: sixMonthsEnd } },
        select: { date: true, amount: true },
      }),
    ]);

    const incomeByMonth = {};
    for (const r of incomeRows) {
      const key = `${r.date.getFullYear()}-${r.date.getMonth() + 1}`;
      incomeByMonth[key] = (incomeByMonth[key] || 0) + r.amount;
    }
    const expenseByMonth = {};
    for (const r of expenseRows) {
      const key = `${r.date.getFullYear()}-${r.date.getMonth() + 1}`;
      expenseByMonth[key] = (expenseByMonth[key] || 0) + r.amount;
    }

    const monthlySummary = months.map(({ year, month }) => {
      const key = `${year}-${month}`;
      const totalIncome   = incomeByMonth[key]  || 0;
      const totalExpenses = expenseByMonth[key] || 0;
      return {
        year,
        month,
        label: new Date(year, month - 1, 1).toLocaleString('default', { month: 'short', year: 'numeric' }),
        income: totalIncome,
        expenses: totalExpenses,
        net: totalIncome - totalExpenses,
      };
    });

    // This month by category
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    thisMonthEnd.setHours(23, 59, 59, 999);

    const expenseByCategory = await prisma.financeEntry.groupBy({
      by: ['category'],
      where: { userId, type: 'expense', date: { gte: thisMonthStart, lte: thisMonthEnd } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    const incomeByCategory = await prisma.financeEntry.groupBy({
      by: ['category'],
      where: { userId, type: 'income', date: { gte: thisMonthStart, lte: thisMonthEnd } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    res.json({
      monthlySummary,
      thisMonth: {
        expenseByCategory: expenseByCategory.map((c) => ({
          category: c.category,
          amount: c._sum.amount || 0,
        })),
        incomeByCategory: incomeByCategory.map((c) => ({
          category: c.category,
          amount: c._sum.amount || 0,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
