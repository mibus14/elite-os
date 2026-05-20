const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/users - All users (for leaderboard/chat)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { xp: 'desc' },
      select: {
        id: true,
        username: true,
        avatar: true,
        level: true,
        xp: true,
        rank: true,
        streak: true,
        createdAt: true,
      },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/profile — update username, avatar, bio
router.put(
  '/profile',
  authenticate,
  [
    body('username').optional().trim().isLength({ min: 3, max: 30 }),
    body('avatar').optional().trim(),
    body('bio').optional().trim().isLength({ max: 200 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { username, avatar, bio } = req.body;

      if (username && username !== req.user.username) {
        const taken = await prisma.user.findFirst({
          where: { username, id: { not: req.user.id } },
        });
        if (taken) return res.status(409).json({ error: 'Nombre de usuario ya en uso' });
      }

      const updated = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          ...(username !== undefined && { username }),
          ...(avatar !== undefined && { avatar }),
          ...(bio !== undefined && { bio }),
        },
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          bio: true,
          level: true,
          xp: true,
          rank: true,
          streak: true,
          longestStreak: true,
          class: true,
          createdAt: true,
        },
      });

      res.json({ user: updated });
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Nombre de usuario ya en uso' });
      next(err);
    }
  }
);

// PUT /api/users/password — change password
router.put(
  '/password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { currentPassword, newPassword } = req.body;
      const bcrypt = require('bcryptjs');

      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(400).json({ error: 'Contraseña actual incorrecta' });

      const hashed = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
      res.json({ message: 'Contraseña actualizada' });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/users/:id/profile - Public profile
router.get('/:id/profile', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        avatar: true,
        level: true,
        xp: true,
        rank: true,
        streak: true,
        longestStreak: true,
        createdAt: true,
        _count: {
          select: {
            gymSessions: true,
            cardioSessions: true,
            habitLogs: true,
            learningSessions: true,
            goals: true,
          },
        },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const [completedGoals, recentActivity] = await Promise.all([
      prisma.goal.count({ where: { userId: req.params.id, status: 'completed' } }),
      prisma.gymSession.findMany({
        where: { userId: req.params.id },
        orderBy: { date: 'desc' },
        take: 5,
        select: { name: true, date: true, totalVolume: true, duration: true },
      }),
    ]);

    res.json({ user: { ...user, completedGoals }, recentActivity });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
