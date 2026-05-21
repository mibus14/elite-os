'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { seasonsApi } from '@/lib/api'
import { Sword, Trophy, Clock, Zap, Star, TrendingUp, Shield } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const RANK_COLORS: Record<string, string> = {
  Bronze:   'text-amber-700',
  Silver:   'text-gray-400',
  Gold:     'text-yellow-400',
  Platinum: 'text-cyan-300',
  Diamond:  'text-blue-300',
}

const RANK_BG: Record<string, string> = {
  Bronze:   'border-amber-700/40 bg-amber-700/10',
  Silver:   'border-gray-400/40 bg-gray-400/10',
  Gold:     'border-yellow-400/40 bg-yellow-400/10',
  Platinum: 'border-cyan-300/40 bg-cyan-300/10',
  Diamond:  'border-blue-300/40 bg-blue-300/10',
}

interface LeaderboardUser {
  id: string; username: string; xp: number; rank: string
  class: string | null; avatar: string | null; level: number
}

interface SeasonData {
  season: {
    number: number; startDate: string; endDate: string
    totalDays: number; daysElapsed: number; daysLeft: number; progressPct: number
  }
  myPosition: number
  myRank: string
  nextBonus: { bonusXP: number; bonusMultiplier: number }
  leaderboard: LeaderboardUser[]
}

interface HistoryResult {
  id: string; finalRank: string; finalXP: number; finalLevel: number
  finalStreak: number; bonusXP: number; bonusMultiplier: number; createdAt: string
  season: { number: number; startDate: string; endDate: string }
}

function SeasonSkeleton() {
  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-3xl mx-auto space-y-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5" />
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-lg bg-white/5" />
          <div className="h-3 w-24 rounded bg-white/5" />
        </div>
      </div>
      <div className="h-40 rounded-2xl bg-white/5" />
      <div className="h-32 rounded-2xl bg-white/5" />
      <div className="h-64 rounded-2xl bg-white/5" />
    </div>
  )
}

export default function SeasonsPage() {
  const { user } = useAuthStore()

  const { data, isLoading, isError, refetch } = useQuery<SeasonData>({
    queryKey: ['seasons-current'],
    queryFn: () => seasonsApi.current().then(r => r.data),
    staleTime: 60_000,
    retry: 1,
  })

  const { data: historyData } = useQuery<{ results: HistoryResult[] }>({
    queryKey: ['seasons-history'],
    queryFn: () => seasonsApi.history().then(r => r.data),
    staleTime: 60_000,
    retry: 1,
  })

  if (isLoading) return <SeasonSkeleton />

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Sword size={32} className="text-gray-700" />
        <p className="text-gray-400 text-sm">No se pudo cargar la temporada</p>
        <button
          onClick={() => refetch()}
          className="px-5 py-2 rounded-xl bg-[#DC143C] text-white text-sm font-bold transition-all hover:opacity-90"
        >
          Reintentar
        </button>
      </div>
    )
  }

  const { season, myPosition, myRank, nextBonus, leaderboard } = data
  const history = historyData?.results ?? []

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-elite-600 flex items-center justify-center shadow-glow-red">
          <Sword size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-heading">
            Temporada <span className="text-elite-600">{season.number}</span>
          </h1>
          <p className="text-xs text-gray-500">La contienda por la élite</p>
        </div>
      </div>

      {/* Season progress card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-elite-600/15 to-[#111] border border-elite-600/25 rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-gray-400" />
            <span className="text-xs text-gray-400 font-medium">
              {new Date(season.startDate).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
              {' — '}
              {new Date(season.endDate).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <span className="text-xs font-bold text-white bg-elite-600/20 border border-elite-600/30 px-2 py-0.5 rounded-full">
            {season.daysLeft}d restantes
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${season.progressPct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-elite-600 to-red-400"
          />
        </div>

        {/* My stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/[0.04] rounded-xl p-3 text-center">
            <div className={`text-lg font-bold ${RANK_COLORS[myRank] ?? 'text-white'}`}>{myRank}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Rango</div>
          </div>
          <div className="bg-white/[0.04] rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-white">#{myPosition}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Posición</div>
          </div>
          <div className="bg-white/[0.04] rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-white">{(user?.xp ?? 0).toLocaleString()}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">XP</div>
          </div>
        </div>
      </motion.div>

      {/* Next season bonus preview */}
      {(nextBonus.bonusXP > 0 || nextBonus.bonusMultiplier > 1) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`border rounded-2xl p-4 ${RANK_BG[myRank] ?? 'border-white/10'}`}
        >
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} className={RANK_COLORS[myRank] ?? 'text-white'} />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Bonus al finalizar — {myRank}
            </span>
          </div>
          <div className="flex gap-3">
            {nextBonus.bonusXP > 0 && (
              <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-3 py-2">
                <Zap size={12} className="text-yellow-400" />
                <span className="text-sm font-bold text-white">+{nextBonus.bonusXP} XP</span>
                <span className="text-xs text-gray-500">inicio</span>
              </div>
            )}
            {nextBonus.bonusMultiplier > 1 && (
              <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-3 py-2">
                <TrendingUp size={12} className="text-green-400" />
                <span className="text-sm font-bold text-white">x{nextBonus.bonusMultiplier.toFixed(2)}</span>
                <span className="text-xs text-gray-500">XP</span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Bonus table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Shield size={14} className="text-gray-400" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bonuses por rango</span>
        </div>
        <div className="space-y-2">
          {[
            { rank: 'Diamond',   xp: 1000, mult: '1.50x', desc: '+1000 XP inicio' },
            { rank: 'Platinum',  xp: 400,  mult: '1.20x', desc: '+400 XP inicio' },
            { rank: 'Gold',      xp: 150,  mult: '1.10x', desc: '+150 XP inicio' },
            { rank: 'Silver',    xp: 50,   mult: '1.05x', desc: '+50 XP inicio' },
            { rank: 'Bronze',    xp: 0,    mult: '1.00x', desc: 'Sin bonus' },
          ].map(({ rank, mult, desc }) => (
            <div key={rank} className={`flex items-center justify-between px-3 py-2 rounded-xl border ${myRank === rank ? RANK_BG[rank] : 'bg-white/[0.02] border-white/[0.04]'}`}>
              <span className={`text-sm font-bold ${RANK_COLORS[rank]}`}>{rank}</span>
              <div className="flex gap-3 text-xs text-gray-400">
                <span>{desc}</span>
                <span className="text-green-400 font-bold">{mult} XP</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={14} className="text-yellow-400" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Clasificación actual</span>
        </div>
        <div className="space-y-2">
          {leaderboard.map((u, i) => (
            <div
              key={u.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                u.id === user?.id
                  ? 'bg-elite-600/10 border border-elite-600/20'
                  : 'bg-white/[0.03] border border-white/[0.04]'
              }`}
            >
              <span className={`text-sm font-black w-5 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-gray-600'}`}>
                {i + 1}
              </span>
              <img
                src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                className="w-7 h-7 rounded-full border border-white/10 flex-shrink-0"
                alt={u.username}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {u.username}{u.id === user?.id && <span className="text-gray-500 text-xs ml-1">(tú)</span>}
                </p>
                <p className={`text-xs ${RANK_COLORS[u.rank] ?? 'text-gray-500'}`}>Lv.{u.level} · {u.rank}</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-yellow-400">
                <Zap size={10} />
                {u.xp.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Season history */}
      {history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} className="text-gray-400" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Historial de temporadas</span>
          </div>
          <div className="space-y-2">
            {history.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-3 py-3 bg-white/[0.03] border border-white/[0.04] rounded-xl">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-500">T{r.season.number}</span>
                    <span className={`text-sm font-bold ${RANK_COLORS[r.finalRank] ?? 'text-white'}`}>{r.finalRank}</span>
                    <span className="text-xs text-gray-600">Lv.{r.finalLevel}</span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-gray-500">
                    <span>{r.finalXP.toLocaleString()} XP final</span>
                    <span>Racha {r.finalStreak}d</span>
                  </div>
                </div>
                <div className="text-right">
                  {r.bonusXP > 0 && (
                    <div className="text-xs font-bold text-yellow-400">+{r.bonusXP} XP</div>
                  )}
                  <div className="text-xs text-green-400">x{r.bonusMultiplier.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
