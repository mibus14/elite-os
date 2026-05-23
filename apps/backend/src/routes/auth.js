const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();

function getRank(xp) {
  if (xp >= 10001) return 'Diamond';
  if (xp >= 5001) return 'Platinum';
  if (xp >= 2001) return 'Gold';
  if (xp >= 501) return 'Silver';
  return 'Bronze';
}

function getLevel(xp) {
  return Math.floor(xp / 500) + 1;
}

function signToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'elite-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '365d' }
  );
}

// POST /api/auth/register
router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password, avatar, class: userClass } = req.body;

      const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
      });
      if (existing) {
        const field = existing.email === email ? 'email' : 'username';
        return res.status(409).json({ error: `That ${field} is already taken` });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          avatar: avatar || null,
          class: userClass || 'Warrior',
          xp: 0,
          level: 1,
          rank: 'Bronze',
          streak: 0,
          longestStreak: 0,
        },
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          level: true,
          xp: true,
          rank: true,
          streak: true,
          longestStreak: true,
          class: true,
          statStr: true,
          statInt: true,
          statVit: true,
          statDis: true,
          statWis: true,
          statGol: true,
          inPenitence: true,
          failStreak: true,
          deathCount: true,
          createdAt: true,
        },
      });

      const token = signToken(user.id);
      res.status(201).json({ token, user });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const userRaw = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true, password: true,
          username: true, email: true, avatar: true, level: true, xp: true,
          rank: true, streak: true, longestStreak: true, class: true,
          statStr: true, statInt: true, statVit: true, statDis: true,
          statWis: true, statGol: true, inPenitence: true, failStreak: true,
          deathCount: true, createdAt: true,
        },
      });
      if (!userRaw) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const valid = await bcrypt.compare(password, userRaw.password);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = signToken(userRaw.id);
      const { password: _pw, ...user } = userRaw;
      res.json({ token, user });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        level: true,
        xp: true,
        rank: true,
        streak: true,
        longestStreak: true,
        class: true,
        statStr: true,
        statInt: true,
        statVit: true,
        statDis: true,
        statWis: true,
        statGol: true,
        inPenitence: true,
        failStreak: true,
        deathCount: true,
        createdAt: true,
        _count: {
          select: {
            gymSessions: true,
            cardioSessions: true,
            habitLogs: true,
            learningItems: true,
            goals: true,
          },
        },
      },
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', authenticate, async (req, res) => {
  const token = signToken(req.user.id);
  res.json({ token });
});

module.exports = router;
