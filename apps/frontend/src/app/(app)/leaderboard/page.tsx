'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Zap, Flame, Target, BookOpen, Dumbbell, Map, X, ShoppingBag, Shield } from 'lucide-react'
import { api, leaderboardApi } from '@/lib/api'
import TitleBadge from '@/components/rpg/TitleBadge'
import { getAvatarUrl } from '@/lib/utils'

/* ─── Types ──────────────────────────────────────────────────────── */
interface LeaderboardUser {
  id: string
  username: string
  avatar: string
  level: number
  xp: number
  rank: string
  streak: number
  gymSessions: number
  cardioKm: number
  habitsStreak: number
  goalsCompleted: number
  studyHours: number
  class?: string
  statStr?: number
  statInt?: number
  statVit?: number
  statDis?: number
  statWis?: number
  statGol?: number
  deathCount?: number
  comboStreak?: number
  isProbation?: boolean
  probationDaysLeft?: number
}

/* ─── RPG Maps ───────────────────────────────────────────────────── */
const CLASS_EMOJI: Record<string, string> = {
  Warrior: '⚔️',
  Monk: '🧘',
  Sage: '📚',
  Assassin: '🗡️',
  Merchant: '💰',
}

const RANK_COLOR: Record<string, string> = {
  Bronze:   'text-orange-400 border-orange-400/30 bg-orange-400/10',
  Silver:   'text-gray-300 border-gray-300/30 bg-gray-300/10',
  Gold:     'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  Platinum: 'text-blue-300 border-blue-300/30 bg-blue-300/10',
  Diamond:  'text-cyan-300 border-cyan-300/30 bg-cyan-300/10',
}

const STAT_ICONS: Record<string, string> = {
  statStr: '💪',
  statInt: '🧠',
  statVit: '❤️',
  statDis: '🎯',
  statWis: '📖',
  statGol: '💰',
}

function getDominantStat(user: LeaderboardUser): { key: string; value: number; icon: string } | null {
  const stats = [
    { key: 'statStr', value: user.statStr ?? 0 },
    { key: 'statInt', value: user.statInt ?? 0 },
    { key: 'statVit', value: user.statVit ?? 0 },
    { key: 'statDis', value: user.statDis ?? 0 },
    { key: 'statWis', value: user.statWis ?? 0 },
    { key: 'statGol', value: user.statGol ?? 0 },
  ]
  const dominant = stats.reduce((best, s) => (s.value > best.value ? s : best), stats[0])
  if (dominant.value === 0) return null
  return { key: dominant.key, value: dominant.value, icon: STAT_ICONS[dominant.key] }
}

/* ─── Skeleton ───────────────────────────────────────────────────── */
function LeaderboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-64 rounded-2xl bg-white/5" />
      <div className="h-48 rounded-2xl bg-white/5" />
    </div>
  )
}

/* ─── Podium ─────────────────────────────────────────────────────── */
function Podium({ users }: { users: LeaderboardUser[] }) {
  if (users.length < 3) return null

  const [first, second, third] = users
  const podiumOrder = [second, first, third]
  const heights = ['h-24', 'h-36', 'h-16']
  const scales = ['scale-95', 'scale-110', 'scale-90']
  const medals = ['🥈', '🥇', '🥉']
  const borderColors = [
    'border-gray-400/50 shadow-[0_0_20px_rgba(156,163,175,0.2)]',
    'border-yellow-400/70 shadow-[0_0_40px_rgba(250,204,21,0.3)]',
    'border-orange-600/50 shadow-[0_0_20px_rgba(234,88,12,0.2)]',
  ]

  return (
    <div className="flex items-end justify-center gap-4 py-8">
      {podiumOrder.map((user, idx) => {
        const isFirst = idx === 1
        const classEmoji = user.class ? CLASS_EMOJI[user.class] : null
        return (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: idx * 0.15,
            }}
            className={`flex flex-col items-center gap-3 ${scales[idx]}`}
          >
            {/* Crown for 1st */}
            {isFirst && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 400 }}
                className="text-3xl"
              >
                👑
              </motion.div>
            )}

            {/* Avatar */}
            <div className={`rounded-full border-2 overflow-hidden ${borderColors[idx]} ${isFirst ? 'w-20 h-20' : 'w-14 h-14'}`}>
              <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt={user.username} className="w-full h-full object-cover bg-[#1E1E1E]" />
            </div>

            {/* Username + class + title */}
            <div className="text-center">
              <p className={`font-bold text-white ${isFirst ? 'text-lg' : 'text-sm'}`}>{user.username}</p>
              {classEmoji && (
                <p className="text-xs text-gray-400">{classEmoji} {user.class}</p>
              )}
              <TitleBadge user={{
                streak: user.streak,
                level: user.level,
                deathCount: user.deathCount ?? 0,
                statStr: user.statStr ?? 0,
                statInt: user.statInt ?? 0,
                comboStreak: user.comboStreak ?? 0,
                rank: user.rank,
              }} />
              <p className={`text-gray-400 ${isFirst ? 'text-sm' : 'text-xs'}`}>Lvl {user.level}</p>
              <p className={`font-bold mt-0.5 ${isFirst ? 'text-yellow-400' : 'text-gray-300'} text-sm`}>
                {user.xp.toLocaleString()} XP
              </p>
            </div>

            {/* Medal + podium block */}
            <div className={`w-24 ${heights[idx]} rounded-t-xl flex items-center justify-center text-2xl font-black text-white/20 ${
              isFirst ? 'bg-gradient-to-b from-yellow-400/20 to-yellow-600/10 border-t-2 border-yellow-400/50'
              : idx === 0 ? 'bg-gradient-to-b from-gray-400/10 to-gray-500/5 border-t-2 border-gray-400/30'
              : 'bg-gradient-to-b from-orange-600/10 to-orange-700/5 border-t-2 border-orange-600/30'
            }`}>
              <span className="text-3xl">{medals[idx]}</span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ─── Comparison Bar ─────────────────────────────────────────────── */
interface MetricBarProps {
  label: string
  icon: React.ReactNode
  users: LeaderboardUser[]
  getValue: (u: LeaderboardUser) => number
  suffix?: string
}

function MetricBars({ label, icon, users, getValue, suffix = '' }: MetricBarProps) {
  const maxVal = Math.max(...users.map(getValue), 1)
  const userColors = ['#DC143C', '#3B82F6', '#22C55E']
  const podiumOrder = [users[0], users[1], users[2]]

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#DC143C]">{icon}</span>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      {podiumOrder.map((user, idx) => {
        const val = getValue(user)
        const pct = (val / maxVal) * 100
        return (
          <div key={user.id} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-20 truncate">{user.username}</span>
            <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: idx * 0.1, ease: [0.23, 1, 0.32, 1] }}
                className="h-full rounded-full"
                style={{ background: userColors[idx] }}
              />
            </div>
            <span className="text-xs font-bold text-white w-12 text-right">{val}{suffix}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Shop catalog (mirrors backend SHOP_ITEMS) ─────────────────── */
const SHOP_CATALOG: Record<string, { name: string; icon: string; category: string; rarity: string }> = {
  frame_silver:  { name: 'Marco Plata',         icon: '⬜', category: 'frame',      rarity: 'common' },
  frame_gold:    { name: 'Marco Dorado',         icon: '🟡', category: 'frame',      rarity: 'rare' },
  frame_fire:    { name: 'Marco de Fuego',       icon: '🔥', category: 'frame',      rarity: 'epic' },
  frame_crimson: { name: 'Marco Carmesí',        icon: '❤️‍🔥', category: 'frame',     rarity: 'legendary' },
  frame_diamond: { name: 'Marco Diamante',       icon: '💎', category: 'frame',      rarity: 'legendary' },
  title_warrior: { name: 'Guerrero del Alba',    icon: '⚔️',  category: 'title',     rarity: 'common' },
  title_iron:    { name: 'Voluntad de Hierro',   icon: '🔩',  category: 'title',     rarity: 'rare' },
  title_shadow:  { name: 'Sombra Letal',         icon: '🗡️', category: 'title',      rarity: 'epic' },
  title_legend:  { name: 'Leyenda Viviente',     icon: '👑',  category: 'title',     rarity: 'legendary' },
  title_god:     { name: 'El Ascendido',         icon: '✨',  category: 'title',     rarity: 'legendary' },
  bg_fire:       { name: 'Aura de Fuego',        icon: '🔥', category: 'background', rarity: 'rare' },
  bg_ocean:      { name: 'Abismo Oceánico',      icon: '🌊', category: 'background', rarity: 'rare' },
  bg_forest:     { name: 'Espíritu del Bosque',  icon: '🌿', category: 'background', rarity: 'rare' },
  bg_galaxy:     { name: 'Cosmos Oscuro',        icon: '🌌', category: 'background', rarity: 'epic' },
  bg_elite:      { name: 'Aura Élite',           icon: '⚡', category: 'background', rarity: 'legendary' },
  avatar_pixel:   { name: 'Avatar Pixel',    icon: '👾', category: 'avatar', rarity: 'common' },
  avatar_robot:   { name: 'Avatar Robot',    icon: '🤖', category: 'avatar', rarity: 'rare' },
  avatar_dark:    { name: 'Avatar Oscuro',   icon: '😈', category: 'avatar', rarity: 'epic' },
  avatar_warrior: { name: 'Guerrero Élite',  icon: '⚔️', category: 'avatar', rarity: 'rare' },
  avatar_sage:    { name: 'Sabio Ancestral', icon: '🧙', category: 'avatar', rarity: 'epic' },
  avatar_noble:   { name: 'Noble Carmesí',   icon: '👑', category: 'avatar', rarity: 'legendary' },
  avatar_phantom: { name: 'El Fantasma',     icon: '👻', category: 'avatar', rarity: 'legendary' },
  avatar_god:     { name: 'Dios Ascendido',  icon: '✨', category: 'avatar', rarity: 'legendary' },
  boost_small:    { name: 'Impulso Menor',   icon: '⚡', category: 'boost',  rarity: 'common' },
  boost_medium:  { name: 'Impulso Mayor',        icon: '🚀', category: 'boost',      rarity: 'rare' },
  boost_legend:  { name: 'Impulso Legendario',   icon: '💥', category: 'boost',      rarity: 'epic' },
}

const RARITY_BADGE: Record<string, string> = {
  common:    'border-gray-500/40 bg-gray-500/10 text-gray-400',
  rare:      'border-blue-500/40 bg-blue-500/10 text-blue-400',
  epic:      'border-purple-500/40 bg-purple-500/10 text-purple-400',
  legendary: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
}

/* ─── User Profile Modal ─────────────────────────────────────────── */
interface UserProfile {
  id: string; username: string; avatar: string; bio?: string
  level: number; xp: number; rank: string; streak: number; longestStreak: number
  class: string; statStr: number; statInt: number; statVit: number
  statDis: number; statWis: number; statGol: number
  deathCount: number; comboStreak: number
  equippedFrame?: string; equippedTitle?: string; equippedBg?: string
  inventory: { itemSlug: string; purchasedAt: string }[]
  goalsCompleted: number; habitsCompleted: number
  gymSessions: number; cardioSessions: number; learningItems: number
  isCurrentUser: boolean
}

function UserProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery<UserProfile>({
    queryKey: ['user-profile', userId],
    queryFn: () => leaderboardApi.userProfile(userId).then((r) => r.data.profile),
    staleTime: 60_000,
  })

  const stats = data ? [
    { key: 'STR', icon: '💪', value: data.statStr },
    { key: 'INT', icon: '🧠', value: data.statInt },
    { key: 'VIT', icon: '❤️', value: data.statVit },
    { key: 'DIS', icon: '🎯', value: data.statDis },
    { key: 'WIS', icon: '📖', value: data.statWis },
    { key: 'GOL', icon: '💰', value: data.statGol },
  ] : []

  const equipped = data ? [
    data.equippedFrame && SHOP_CATALOG[data.equippedFrame],
    data.equippedTitle && SHOP_CATALOG[data.equippedTitle],
    data.equippedBg    && SHOP_CATALOG[data.equippedBg],
  ].filter(Boolean) : []

  const inventory = data?.inventory ?? []

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-[#111111] border border-[#1E1E1E] rounded-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto shadow-2xl"
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all z-10"
          >
            <X size={18} />
          </button>

          {isLoading && (
            <div className="p-10 text-center text-gray-500 animate-pulse">Cargando perfil…</div>
          )}

          {data && (
            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-elite-600/40 bg-[#1E1E1E] flex-shrink-0">
                  <img src={getAvatarUrl(data.avatar, data.username)} alt={data.username} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-white">{data.username}</h2>
                    {data.isCurrentUser && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-elite-600/40 bg-elite-600/10 text-elite-600 font-bold">TÚ</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">{CLASS_EMOJI[data.class]} {data.class} · Lv.{data.level}</p>
                  <p className="text-yellow-400 text-sm font-semibold">{data.xp.toLocaleString()} XP</p>
                  {data.bio && <p className="text-gray-500 text-xs mt-1 truncate">{data.bio}</p>}
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '🔥 Racha', value: `${data.streak}d` },
                  { label: '⚡ Mejor', value: `${data.longestStreak}d` },
                  { label: '💀 Muertes', value: data.deathCount },
                ].map((s) => (
                  <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center border border-white/8">
                    <p className="text-white font-bold text-lg">{s.value}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Activity stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '🏋️ Gym', value: data.gymSessions },
                  { label: '🎯 Metas', value: data.goalsCompleted },
                  { label: '📚 Estudio', value: data.learningItems },
                ].map((s) => (
                  <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center border border-white/8">
                    <p className="text-white font-bold text-lg">{s.value}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* RPG Stats */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Shield size={12} /> Estadísticas RPG
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {stats.map((s) => (
                    <div key={s.key} className="bg-white/5 rounded-xl p-2.5 border border-white/8 flex items-center gap-2">
                      <span className="text-base">{s.icon}</span>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-semibold">{s.key}</p>
                        <p className="text-white font-bold text-sm">{s.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Equipped items */}
              {equipped.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Equipado</p>
                  <div className="flex flex-wrap gap-2">
                    {equipped.map((item: any, i) => (
                      <span
                        key={i}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium ${RARITY_BADGE[item.rarity]}`}
                      >
                        {item.icon} {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Inventory */}
              {inventory.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ShoppingBag size={12} /> Colección ({inventory.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {inventory.map((inv) => {
                      const item = SHOP_CATALOG[inv.itemSlug]
                      if (!item) return null
                      return (
                        <span
                          key={inv.itemSlug}
                          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium ${RARITY_BADGE[item.rarity]}`}
                          title={item.name}
                        >
                          {item.icon} {item.name}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {inventory.length === 0 && (
                <div className="text-center py-4 text-gray-600 text-sm">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Sin items en el mercado aún
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function LeaderboardPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const { data: players, isLoading } = useQuery({
    queryKey: ['rpg-leaderboard'],
    queryFn: async () => {
      const res = await api.get('/rpg/leaderboard')
      return (res.data.users ?? res.data.leaderboard ?? []) as LeaderboardUser[]
    },
  })

  const users = players ?? []

  const metrics = [
    { label: 'XP Total', icon: <Zap className="w-4 h-4" />, getValue: (u: LeaderboardUser) => u.xp, suffix: '' },
    { label: 'Hazañas en la Forja', icon: <Dumbbell className="w-4 h-4" />, getValue: (u: LeaderboardUser) => u.gymSessions ?? 0, suffix: '' },
    { label: 'Campo de Batalla (km)', icon: <Map className="w-4 h-4" />, getValue: (u: LeaderboardUser) => u.cardioKm ?? 0, suffix: 'km' },
    { label: 'Racha de Juramentos', icon: <Flame className="w-4 h-4" />, getValue: (u: LeaderboardUser) => u.habitsStreak ?? 0, suffix: 'd' },
    { label: 'Misiones Cumplidas', icon: <Target className="w-4 h-4" />, getValue: (u: LeaderboardUser) => u.goalsCompleted ?? 0, suffix: '' },
    { label: 'Horas en el Grimorio', icon: <BookOpen className="w-4 h-4" />, getValue: (u: LeaderboardUser) => u.studyHours ?? 0, suffix: 'h' },
  ]

  if (isLoading) return <LeaderboardSkeleton />

  if (users.length === 0) {
    return (
      <div className="space-y-8 pb-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Salón de Héroes</h1>
            <p className="text-gray-500 mt-1">Los guerreros más poderosos del reino</p>
          </div>
        </motion.div>
        <div className="text-center py-20 text-gray-600">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold">El salón aún está vacío</p>
          <p className="text-sm mt-1">Completa hazañas para ganarte un lugar aquí</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      {/* User profile modal */}
      {selectedUserId && (
        <UserProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Trophy className="w-8 h-8 text-yellow-400" />
        <div>
          <h1 className="text-3xl font-bold text-white">Salón de Héroes</h1>
          <p className="text-gray-500 mt-1">Los guerreros más poderosos del reino — <span className="text-gray-600 text-xs">Toca un jugador para ver su perfil</span></p>
        </div>
      </motion.div>

      {/* Podium */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-[#1E1E1E]">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Top 3</h2>
        </div>
        <Podium users={users} />
      </div>

      {/* Comparison Stats */}
      {users.length >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Cara a Cara</h2>
            <div className="flex items-center gap-4 text-xs">
              {users.slice(0, 3).map((user, idx) => (
                <div key={user.id} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: ['#DC143C', '#3B82F6', '#22C55E'][idx] }}
                  />
                  <span className="text-gray-400">{user.username}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {metrics.map((m) => (
              <MetricBars
                key={m.label}
                label={m.label}
                icon={m.icon}
                users={users}
                getValue={m.getValue}
                suffix={m.suffix}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Detailed table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#111111] border border-[#1E1E1E] rounded-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-[#1E1E1E]">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Todos los Guerreros</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1E1E1E]">
                <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Pos.</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Jugador</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Clase</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Nivel</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">XP</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Racha</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Stat</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Rango</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => {
                const rankEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`
                const rankCls = RANK_COLOR[user.rank] ?? RANK_COLOR.Bronze
                const classEmoji = user.class ? CLASS_EMOJI[user.class] : null
                const dominant = getDominantStat(user)
                return (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + idx * 0.06 }}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`border-b border-[#1E1E1E] hover:bg-white/5 transition-colors cursor-pointer ${idx === 0 ? 'bg-yellow-400/5' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <span className="text-xl">{rankEmoji}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 bg-[#1E1E1E]">
                          <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt={user.username} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">{user.username}</span>
                            {user.isProbation && (
                              <span
                                title={`En probación — ${user.probationDaysLeft}d restantes. XP al 60%.`}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-400 leading-none"
                              >
                                ROOKIE
                              </span>
                            )}
                          </div>
                          <TitleBadge user={{
                            streak: user.streak,
                            level: user.level,
                            deathCount: user.deathCount ?? 0,
                            statStr: user.statStr ?? 0,
                            statInt: user.statInt ?? 0,
                            comboStreak: user.comboStreak ?? 0,
                            rank: user.rank,
                          }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {classEmoji ? (
                        <span className="text-sm text-gray-300">{classEmoji} {user.class}</span>
                      ) : (
                        <span className="text-gray-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-gray-300 font-bold">{user.level}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-yellow-400 font-bold">{user.xp.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-orange-400">🔥 {user.streak}d</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {dominant ? (
                        <span className="text-sm text-gray-300">{dominant.icon} {dominant.value}</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full border ${rankCls}`}>
                        {user.rank}
                      </span>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
