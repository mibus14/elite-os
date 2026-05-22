const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

const corsOptions = {
  origin: (origin, cb) => cb(null, true),
  credentials: true,
};

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/auth',       require('../src/routes/auth'));
app.use('/api/dashboard',  require('../src/routes/dashboard'));
app.use('/api/habits',     require('../src/routes/habits'));
app.use('/api/gym',        require('../src/routes/gym'));
app.use('/api/nutrition',  require('../src/routes/nutrition'));
app.use('/api/cardio',     require('../src/routes/cardio'));
app.use('/api/goals',      require('../src/routes/goals'));
app.use('/api/leaderboard',require('../src/routes/leaderboard'));
app.use('/api/messages',   require('../src/routes/messages'));
app.use('/api/learning',   require('../src/routes/learning'));
app.use('/api/finance',    require('../src/routes/finance'));
app.use('/api/savings',    require('../src/routes/savings'));
app.use('/api/bets',       require('../src/routes/bets'));
app.use('/api/rewards',    require('../src/routes/rewards'));
app.use('/api/users',      require('../src/routes/users'));
app.use('/api/rpg',        require('../src/routes/rpg'));
app.use('/api/daily-log',  require('../src/routes/daily-log'));
app.use('/api/report',     require('../src/routes/report'));
app.use('/api/seasons',    require('../src/routes/seasons').router);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  if (err.code === 'P2002') return res.status(409).json({ error: 'Resource already exists' });
  if (err.code === 'P2025') return res.status(404).json({ error: 'Resource not found' });
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

module.exports = app;
