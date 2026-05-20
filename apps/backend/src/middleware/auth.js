const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.slice(7);

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'elite-secret');
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Invalid token', code: 'TOKEN_INVALID' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authenticate;
