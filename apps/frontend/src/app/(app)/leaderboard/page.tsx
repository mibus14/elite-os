'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trophy, Zap, Flame, Target, BookOpen, Dumbbell, Map } from 'lucide-react'
import { leaderboardApi } from '@/lib/api'

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
}

/* ─── Mock Data ──────────────────────────────────────────────────── */
const mockLeaderboard: LeaderboardUser[] = [
  {
    id: '1', username: 'Diego', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=diego',
    level: 15, xp: 7340, rank: 'Platinum', streak: 21, gymSessions: 48, cardioKm: 124,
    habitsStreak: 21, goalsCompleted: 8, studyHours: 42,
  },
  {
    id: '2', username: 'Cristopher', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cristopher',
    level: 12, xp: 5890, rank: 'Gold', streak: 14, gymSessions: 38, cardioKm: 96,
    habitsStreak: 14, goalsCompleted: 6, studyHours: 67,
  },
  {
    id: '3', username: 'Pedro', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pedro',
    level: 10, xp: 4920, rank: 'Gold', streak: 8, gymSessions: 31, cardioKm: 78,
    habitsStreak: 8, goalsCompleted: 5, studyHours: 38,
  },
]

const RANK_COLORS = {
  Platinum: 'from-cyan-400 to-blue-400',
  Gold: 'from-yellow-400 to-orange-400',
  Silver: 'from-gray-300 to-gray-400',
  Bronze: 'from-orange-600 to-orange-800',
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
  const labels = ['2nd', '1st', '3rd']
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
              <img src={user.avatar} alt={user.username} className="w-full h-full object-cover bg-[#1E1E1E]" />
            </div>

            {/* Username */}
            <div className="text-center">
              <p className={`font-bold text-white ${isFirst ? 'text-lg' : 'text-sm'}`}>{user.username}</p>
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

/* ─── Page ───────────────────────────────────────────────────────── */
export default function LeaderboardPage() {
  const { data: rankings, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const res = await leaderboardApi.rankings()
      return res.data as LeaderboardUser[]
    },
    placeholderData: mockLeaderboard,
  })

  const users = rankings && rankings.length >= 3 ? rankings : mockLeaderboard

  const metrics = [
    { label: 'Total XP', icon: <Zap className="w-4 h-4" />, getValue: (u: LeaderboardUser) => u.xp, suffix: '' },
    { label: 'Gym Sessions', icon: <Dumbbell className="w-4 h-4" />, getValue: (u: LeaderboardUser) => u.gymSessions, suffix: '' },
    { label: 'Cardio (km)', icon: <Map className="w-4 h-4" />, getValue: (u: LeaderboardUser) => u.cardioKm, suffix: 'km' },
    { label: 'Habits Streak', icon: <Flame className="w-4 h-4" />, getValue: (u: LeaderboardUser) => u.habitsStreak, suffix: 'd' },
    { label: 'Goals Done', icon: <Target className="w-4 h-4" />, getValue: (u: LeaderboardUser) => u.goalsCompleted, suffix: '' },
    { label: 'Study Hours', icon: <BookOpen className="w-4 h-4" />, getValue: (u: LeaderboardUser) => u.studyHours, suffix: 'h' },
  ]

  if (isLoading) return <LeaderboardSkeleton />

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Trophy className="w-8 h-8 text-yellow-400" />
        <div>
          <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
          <p className="text-gray-500 mt-1">Who's winning the grind?</p>
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
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Head to Head</h2>
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

      {/* Detailed table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#111111] border border-[#1E1E1E] rounded-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-[#1E1E1E]">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Full Rankings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1E1E1E]">
                <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Rank</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Player</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Level</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">XP</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Streak</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Gym</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Goals</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Badge</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => {
                const rankEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'
                const rankColor = RANK_COLORS[user.rank as keyof typeof RANK_COLORS] || RANK_COLORS.Gold
                return (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + idx * 0.06 }}
                    className={`border-b border-[#1E1E1E] hover:bg-white/3 transition-colors ${idx === 0 ? 'bg-yellow-400/5' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <span className="text-xl">{rankEmoji}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 bg-[#1E1E1E]">
                          <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-white font-semibold">{user.username}</span>
                      </div>
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
                    <td className="px-6 py-4 text-right text-gray-300">{user.gymSessions}</td>
                    <td className="px-6 py-4 text-right text-gray-300">{user.goalsCompleted}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r ${rankColor} bg-clip-text text-transparent border border-white/10`}>
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
