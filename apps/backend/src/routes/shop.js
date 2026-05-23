const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();

const RARITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3 };

const SHOP_ITEMS = [
  // ── Frames ──────────────────────────────────────────────────────────────────
  { slug: 'frame_silver',  name: 'Marco Plata',         category: 'frame',      price: 150,  icon: '⬜', rarity: 'common',    desc: 'Elegante marco plateado para tu avatar',        frame: 'ring-2 ring-gray-300 ring-offset-2 ring-offset-black' },
  { slug: 'frame_gold',    name: 'Marco Dorado',        category: 'frame',      price: 350,  icon: '🟡', rarity: 'rare',      desc: 'El brillo inconfundible del oro',               frame: 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-black shadow-[0_0_10px_rgba(250,204,21,0.6)]' },
  { slug: 'frame_fire',    name: 'Marco de Fuego',      category: 'frame',      price: 700,  icon: '🔥', rarity: 'epic',      desc: 'Tu avatar consume todo con llamas',             frame: 'ring-2 ring-orange-500 ring-offset-2 ring-offset-black shadow-[0_0_14px_rgba(249,115,22,0.8)]' },
  { slug: 'frame_crimson', name: 'Marco Carmesí',       category: 'frame',      price: 1500, icon: '❤️‍🔥', rarity: 'legendary', desc: 'El marco de los campeones de élite',            frame: 'ring-2 ring-[#DC143C] ring-offset-2 ring-offset-black shadow-[0_0_18px_rgba(220,20,60,0.9)]' },
  { slug: 'frame_diamond', name: 'Marco Diamante',      category: 'frame',      price: 2500, icon: '💎', rarity: 'legendary', desc: 'Brillante como un diamante, implacable como tú', frame: 'ring-2 ring-cyan-300 ring-offset-2 ring-offset-black shadow-[0_0_18px_rgba(103,232,249,0.9)]' },
  // ── Titles ──────────────────────────────────────────────────────────────────
  { slug: 'title_warrior', name: 'Guerrero del Alba',   category: 'title',      price: 200,  icon: '⚔️',  rarity: 'common',    desc: 'Forjado en las primeras horas del día' },
  { slug: 'title_iron',    name: 'Voluntad de Hierro',  category: 'title',      price: 450,  icon: '🔩',  rarity: 'rare',      desc: 'Nada ni nadie te detiene' },
  { slug: 'title_shadow',  name: 'Sombra Letal',        category: 'title',      price: 900,  icon: '🗡️', rarity: 'epic',      desc: 'Silencioso pero absolutamente implacable' },
  { slug: 'title_legend',  name: 'Leyenda Viviente',    category: 'title',      price: 2000, icon: '👑',  rarity: 'legendary', desc: 'Solo los más grandes llevan este título' },
  { slug: 'title_god',     name: 'El Ascendido',        category: 'title',      price: 5000, icon: '✨',  rarity: 'legendary', desc: 'Has trascendido lo que cualquier humano puede lograr' },
  // ── Backgrounds ─────────────────────────────────────────────────────────────
  { slug: 'bg_fire',       name: 'Aura de Fuego',       category: 'background', price: 300,  icon: '🔥', rarity: 'rare',      desc: 'Tu perfil en llamas',           gradient: 'from-orange-950 to-red-950' },
  { slug: 'bg_ocean',      name: 'Abismo Oceánico',     category: 'background', price: 300,  icon: '🌊', rarity: 'rare',      desc: 'La calma del océano profundo',  gradient: 'from-blue-950 to-cyan-950' },
  { slug: 'bg_forest',     name: 'Espíritu del Bosque', category: 'background', price: 300,  icon: '🌿', rarity: 'rare',      desc: 'Serenidad y fortaleza natural', gradient: 'from-green-950 to-emerald-950' },
  { slug: 'bg_galaxy',     name: 'Cosmos Oscuro',       category: 'background', price: 700,  icon: '🌌', rarity: 'epic',      desc: 'El universo entero como lienzo',gradient: 'from-purple-950 to-indigo-950' },
  { slug: 'bg_elite',      name: 'Aura Élite',          category: 'background', price: 1200, icon: '⚡', rarity: 'legendary', desc: 'El fondo oficial de la élite',   gradient: 'from-red-950/60 to-black' },
  // ── Avatar styles ────────────────────────────────────────────────────────────
  { slug: 'avatar_pixel',  name: 'Avatar Pixel',        category: 'avatar',     price: 250,  icon: '👾', rarity: 'common',    desc: 'Retro 8-bit, directo de los arcades', style: 'pixel-art' },
  { slug: 'avatar_robot',  name: 'Avatar Robot',        category: 'avatar',     price: 400,  icon: '🤖', rarity: 'rare',      desc: 'Tu versión de acero y circuitos',    style: 'bottts' },
  { slug: 'avatar_dark',   name: 'Avatar Oscuro',       category: 'avatar',     price: 800,  icon: '😈', rarity: 'epic',      desc: 'Desata tu lado más oscuro',          style: 'fun-emoji' },
  // ── XP Boosts ────────────────────────────────────────────────────────────────
  { slug: 'boost_small',   name: 'Impulso Menor',       category: 'boost',      price: 80,   icon: '⚡', rarity: 'common',    desc: '+25% XP durante 2 horas',  multiplier: 1.25, hours: 2 },
  { slug: 'boost_medium',  name: 'Impulso Mayor',       category: 'boost',      price: 200,  icon: '🚀', rarity: 'rare',      desc: '+50% XP durante 4 horas',  multiplier: 1.5,  hours: 4 },
  { slug: 'boost_legend',  name: 'Impulso Legendario',  category: 'boost',      price: 500,  icon: '💥', rarity: 'epic',      desc: '+100% XP durante 24 horas',multiplier: 2.0,  hours: 24 },
];

module.exports.SHOP_ITEMS = SHOP_ITEMS;

// GET /api/shop/catalog — all items with ownership status
router.get('/catalog', authenticate, async (req, res, next) => {
  try {
    const [inventory, user, activeBoosts] = await Promise.all([
      prisma.userInventory.findMany({ where: { userId: req.user.id }, select: { itemSlug: true } }),
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: { gold: true, equippedFrame: true, equippedTitle: true, equippedBg: true },
      }),
      prisma.activeBoost.findMany({
        where: { userId: req.user.id, expiresAt: { gt: new Date() } },
        select: { itemSlug: true, multiplier: true, expiresAt: true },
      }),
    ]);

    const owned = new Set(inventory.map(i => i.itemSlug));
    const activeSlugs = new Set(activeBoosts.map(b => b.itemSlug));

    const items = SHOP_ITEMS.map(item => ({
      ...item,
      owned: owned.has(item.slug) || activeSlugs.has(item.slug),
      equipped: (
        (item.category === 'frame'      && user.equippedFrame === item.slug) ||
        (item.category === 'title'      && user.equippedTitle === item.slug) ||
        (item.category === 'background' && user.equippedBg    === item.slug)
      ),
      activeBoost: item.category === 'boost' ? activeBoosts.find(b => b.itemSlug === item.slug) || null : null,
    }));

    res.json({
      items,
      gold: user.gold,
      equipped: { frame: user.equippedFrame, title: user.equippedTitle, bg: user.equippedBg },
    });
  } catch (err) { next(err); }
});

// POST /api/shop/buy/:slug
router.post('/buy/:slug', authenticate, async (req, res, next) => {
  try {
    const item = SHOP_ITEMS.find(i => i.slug === req.params.slug);
    if (!item) return res.status(404).json({ error: 'Ítem no encontrado' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { gold: true } });
    if (user.gold < item.price) return res.status(400).json({ error: `Oro insuficiente (necesitas ${item.price} 🪙, tienes ${user.gold} 🪙)` });

    if (item.category === 'boost') {
      // Boosts are consumable — can buy multiple times, creates a timed active boost
      const expiresAt = new Date(Date.now() + item.hours * 3_600_000);
      const [, updatedUser] = await Promise.all([
        prisma.activeBoost.create({
          data: { userId: req.user.id, itemSlug: item.slug, multiplier: item.multiplier, expiresAt },
        }),
        prisma.user.update({
          where: { id: req.user.id },
          data: { gold: { decrement: item.price } },
          select: { gold: true },
        }),
      ]);
      return res.json({ message: `${item.name} activado hasta ${expiresAt.toISOString()}`, item, gold: updatedUser.gold });
    }

    // Non-consumable: check if already owned
    const existing = await prisma.userInventory.findUnique({
      where: { userId_itemSlug: { userId: req.user.id, itemSlug: item.slug } },
    });
    if (existing) return res.status(400).json({ error: 'Ya posees este ítem' });

    const [, updatedUser] = await Promise.all([
      prisma.userInventory.create({ data: { userId: req.user.id, itemSlug: item.slug } }),
      prisma.user.update({ where: { id: req.user.id }, data: { gold: { decrement: item.price } }, select: { gold: true } }),
    ]);

    res.json({ message: `${item.name} comprado`, item, gold: updatedUser.gold });
  } catch (err) { next(err); }
});

// POST /api/shop/equip/:slug — toggle equip/unequip
router.post('/equip/:slug', authenticate, async (req, res, next) => {
  try {
    const item = SHOP_ITEMS.find(i => i.slug === req.params.slug);
    if (!item) return res.status(404).json({ error: 'Ítem no encontrado' });

    const EQUIPPABLE = ['frame', 'title', 'background', 'avatar'];
    if (!EQUIPPABLE.includes(item.category)) return res.status(400).json({ error: 'Este ítem no se puede equipar' });

    // Verify ownership
    const existing = await prisma.userInventory.findUnique({
      where: { userId_itemSlug: { userId: req.user.id, itemSlug: item.slug } },
    });
    if (!existing) return res.status(403).json({ error: 'No posees este ítem' });

    const fieldMap = { frame: 'equippedFrame', title: 'equippedTitle', background: 'equippedBg', avatar: 'avatar' };
    const field = fieldMap[item.category];

    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { [field]: true } });
    const isEquipped = user[field] === item.slug;

    let newValue;
    if (item.category === 'avatar') {
      // Avatar: equip sets the avatar URL, unequip resets to null
      newValue = isEquipped ? null : `https://api.dicebear.com/7.x/${item.style}/svg?seed=${req.user.id}`;
    } else {
      newValue = isEquipped ? null : item.slug;
    }

    await prisma.user.update({ where: { id: req.user.id }, data: { [field]: newValue } });
    res.json({ equipped: !isEquipped, item, newValue });
  } catch (err) { next(err); }
});

// GET /api/shop/inventory — user's owned items
router.get('/inventory', authenticate, async (req, res, next) => {
  try {
    const [inventory, user, activeBoosts] = await Promise.all([
      prisma.userInventory.findMany({ where: { userId: req.user.id } }),
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: { gold: true, equippedFrame: true, equippedTitle: true, equippedBg: true },
      }),
      prisma.activeBoost.findMany({
        where: { userId: req.user.id, expiresAt: { gt: new Date() } },
      }),
    ]);

    const ownedSlugs = new Set(inventory.map(i => i.itemSlug));
    const ownedItems = SHOP_ITEMS
      .filter(i => ownedSlugs.has(i.slug))
      .map(i => ({
        ...i,
        equipped: (
          (i.category === 'frame'      && user.equippedFrame === i.slug) ||
          (i.category === 'title'      && user.equippedTitle === i.slug) ||
          (i.category === 'background' && user.equippedBg    === i.slug)
        ),
      }));

    res.json({
      items: ownedItems,
      gold: user.gold,
      equipped: { frame: user.equippedFrame, title: user.equippedTitle, bg: user.equippedBg },
      activeBoosts,
    });
  } catch (err) { next(err); }
});

module.exports.router = router;
