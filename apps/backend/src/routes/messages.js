const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/messages/conversations — all users with last message + unread count
router.get('/conversations', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const users = await prisma.user.findMany({
      where: { id: { not: userId } },
      select: { id: true, username: true, avatar: true, level: true, rank: true },
      orderBy: { username: 'asc' },
    });

    const conversations = await Promise.all(users.map(async (user) => {
      const [lastMessage, unreadCount] = await Promise.all([
        prisma.message.findFirst({
          where: { OR: [{ senderId: userId, receiverId: user.id }, { senderId: user.id, receiverId: userId }] },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.message.count({ where: { senderId: user.id, receiverId: userId, read: false } }),
      ]);
      return { user: { ...user, online: false }, lastMessage, unreadCount };
    }));

    conversations.sort((a, b) => {
      const tA = a.lastMessage?.createdAt?.getTime() ?? 0;
      const tB = b.lastMessage?.createdAt?.getTime() ?? 0;
      return tB - tA;
    });

    const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);
    res.json({ conversations, totalUnread });
  } catch (err) { next(err); }
});

// GET /api/messages/users — all users except self (for chat list), with online status stub
router.get('/users', authenticate, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { id: { not: req.user.id } },
      orderBy: { username: 'asc' },
      select: {
        id: true,
        username: true,
        avatar: true,
        level: true,
        rank: true,
      },
    });
    // online status is managed client-side via socket; default to false here
    const usersWithOnline = users.map((u) => ({ ...u, online: false }));
    res.json({ users: usersWithOnline });
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/unread/count
router.get('/unread/count', authenticate, async (req, res, next) => {
  try {
    const count = await prisma.message.count({
      where: { receiverId: req.user.id, read: false },
    });
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/:userId - Get conversation with a specific user
router.get('/:userId', authenticate, async (req, res, next) => {
  try {
    const otherUserId = req.params.userId;
    const { limit = 50, before } = req.query;

    const where = {
      OR: [
        { senderId: req.user.id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: req.user.id },
      ],
      ...(before && { createdAt: { lt: new Date(before) } }),
    };

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: parseInt(limit),
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
        receiver: { select: { id: true, username: true, avatar: true } },
      },
    });

    // Mark received messages as read
    await prisma.message.updateMany({
      where: { senderId: otherUserId, receiverId: req.user.id, read: false },
      data: { read: true },
    });

    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

// POST /api/messages
router.post(
  '/',
  authenticate,
  [
    body('receiverId').notEmpty().withMessage('Receiver required'),
    body('content').trim().notEmpty().withMessage('Content required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { receiverId, content } = req.body;

      const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
      if (!receiver) return res.status(404).json({ error: 'Receiver not found' });

      if (receiverId === req.user.id) {
        return res.status(400).json({ error: 'Cannot message yourself' });
      }

      const message = await prisma.message.create({
        data: {
          senderId: req.user.id,
          receiverId,
          content,
        },
        include: {
          sender: { select: { id: true, username: true, avatar: true } },
          receiver: { select: { id: true, username: true, avatar: true } },
        },
      });

      res.status(201).json({ message });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/messages/:id/read
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    const message = await prisma.message.findFirst({
      where: { id: req.params.id, receiverId: req.user.id },
    });
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: { read: true },
    });

    res.json({ message: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
