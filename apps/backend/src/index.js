require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const app = express();
const httpServer = createServer(app);

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',').map(o => o.trim());
const corsOptions = {
  origin: (origin, cb) => cb(null, true),
  credentials: true,
};

const io = new Server(httpServer, {
  cors: { origin: (origin, cb) => cb(null, true), methods: ['GET', 'POST'], credentials: true },
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors(corsOptions));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later.' },
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/habits', require('./routes/habits'));
app.use('/api/gym', require('./routes/gym'));
app.use('/api/nutrition', require('./routes/nutrition'));
app.use('/api/cardio', require('./routes/cardio'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/learning', require('./routes/learning'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/savings',  require('./routes/savings'));
app.use('/api/bets',     require('./routes/bets'));
app.use('/api/rewards',  require('./routes/rewards'));
app.use('/api/users', require('./routes/users'));
app.use('/api/rpg', require('./routes/rpg'));
app.use('/api/daily-log', require('./routes/daily-log'));
app.use('/api/report', require('./routes/report'));
app.use('/api/seasons', require('./routes/seasons').router);
app.use('/api/shop', require('./routes/shop').router);

// ─── Season Init ──────────────────────────────────────────────────────────────
const { ensureActiveSeason, endCurrentSeason } = require('./routes/seasons');
const { PrismaClient: PrismaSeasons } = require('@prisma/client');
(async () => {
  const p = new PrismaSeasons();
  try { await ensureActiveSeason(p); } catch(e) { console.error('[SEASON] init error:', e.message); } finally { await p.$disconnect(); }
})();

// ─── Season End Cron (daily 00:01) ────────────────────────────────────────────
function scheduleSeasonCheck() {
  const now = new Date();
  const next = new Date();
  next.setDate(now.getDate() + 1);
  next.setHours(0, 1, 0, 0);
  setTimeout(async () => {
    const ps = new PrismaSeasons();
    try {
      const season = await ps.season.findFirst({ where: { status: 'active' } });
      if (season && new Date(season.endDate) <= new Date()) {
        await endCurrentSeason(ps);
      }
    } catch(e) { console.error('[SEASON CRON]', e.message); }
    finally { await ps.$disconnect(); scheduleSeasonCheck(); }
  }, next - now);
}
scheduleSeasonCheck();

// ─── Daily Streak Cron ────────────────────────────────────────────────────────
const { checkAndUpdateStreak } = require('./lib/rpg');
const { PrismaClient: PrismaClientCron } = require('@prisma/client');

// Run daily at 00:05 to penalize inactive users
function scheduleMidnightCheck() {
  const now = new Date();
  const next = new Date();
  next.setDate(now.getDate() + 1);
  next.setHours(0, 5, 0, 0);
  const msUntilNext = next - now;

  setTimeout(async () => {
    const prisma = new PrismaClientCron();
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find users whose lastActiveDate is NOT today
      const inactiveUsers = await prisma.user.findMany({
        where: {
          OR: [
            { lastActiveDate: { lt: today } },
            { lastActiveDate: null }
          ]
        },
        select: { id: true }
      });

      for (const user of inactiveUsers) {
        await checkAndUpdateStreak(user.id, prisma);
      }
      console.log(`[CRON] Checked ${inactiveUsers.length} inactive users`);
    } catch(e) {
      console.error('[CRON] Error:', e);
    } finally {
      await prisma.$disconnect();
      scheduleMidnightCheck(); // reschedule for next day
    }
  }, msUntilNext);
}
scheduleMidnightCheck();

// ─── Daily Backup Cron (03:00 UTC) ───────────────────────────────────────────
const { PrismaClient: PrismaBackup } = require('@prisma/client');

function scheduleBackup() {
  const now = new Date();
  const next = new Date();
  next.setUTCDate(now.getUTCDate() + (now.getUTCHours() >= 3 ? 1 : 0));
  next.setUTCHours(3, 0, 0, 0);
  const ms = next - now;

  setTimeout(async () => {
    const pb = new PrismaBackup();
    try {
      const users = await pb.user.findMany({
        select: {
          id: true, username: true, email: true, class: true,
          xp: true, level: true, rank: true, streak: true,
          createdAt: true,
        },
      });
      const counts = await Promise.all([
        pb.gymSession.count(),
        pb.cardioSession.count(),
        pb.meal.count(),
        pb.habitLog.count(),
        pb.goal.count(),
        pb.dailyLog.count(),
      ]);
      console.log('[BACKUP]', JSON.stringify({
        ts: new Date().toISOString(),
        users,
        totals: {
          gymSessions: counts[0], cardioSessions: counts[1], meals: counts[2],
          habitLogs: counts[3], goals: counts[4], dailyLogs: counts[5],
        },
      }));
    } catch (e) {
      console.error('[BACKUP ERROR]', e.message);
    } finally {
      await pb.$disconnect();
      scheduleBackup();
    }
  }, ms);
}
scheduleBackup();

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Resource already exists' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Resource not found' });
  }

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(status).json({ error: message });
});

// ─── Socket.io ────────────────────────────────────────────────────────────────
const onlineUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'elite-secret');
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  onlineUsers.set(userId, socket.id);
  io.emit('users:online', Array.from(onlineUsers.keys()));

  socket.on('message:send', (data) => {
    const receiverSocketId = onlineUsers.get(data.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('message:received', {
        ...data,
        senderId: userId,
        createdAt: new Date().toISOString(),
      });
    }
  });

  socket.on('message:read', (data) => {
    const senderSocketId = onlineUsers.get(data.senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit('message:read_ack', { messageId: data.messageId });
    }
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    io.emit('users:online', Array.from(onlineUsers.keys()));
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[ELITE OS] Backend running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

module.exports = { app, io };
