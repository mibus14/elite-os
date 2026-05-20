'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trophy, Lock } from 'lucide-react'
import { rpgApi } from '@/lib/api'
import type { RPGCharacter } from '@/types'

/* ─── Achievement definitions ─────────────────────────────────────── */
interface Achievement {
  id: string
  icon: string
  name: string
  description: string
  unlocked: boolean
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

const RARITY_STYLES = {
  common:    { border: 'border-gray-700',     glow: '',                              badge: 'text-gray-400',    bg: 'bg-gray-800/40' },
  rare:      { border: 'border-blue-700/60',  glow: 'shadow-[0_0_12px_rgba(59,130,246,0.25)]',  badge: 'text-blue-400',    bg: 'bg-blue-900/20' },
  epic:      { border: 'border-purple-600/60',glow: 'shadow-[0_0_14px_rgba(147,51,234,0.3)]',   badge: 'text-purple-400',  bg: 'bg-purple-900/20' },
  legendary: { border: 'border-yellow-500/60',glow: 'shadow-[0_0_18px_rgba(234,179,8,0.35)]',   badge: 'text-yellow-400',  bg: 'bg-yellow-900/20' },
}

function buildAchievements(c: RPGCharacter | undefined): Achievement[] {
  if (!c) return []
  const level = c.level ?? 0
  const streak = c.streak ?? 0
  return [
    {
      id: 'primer_paso',
      icon: '🌟',
      name: 'Primer Paso',
      description: 'Alcanza el nivel 2',
      unlocked: level >= 2,
      rarity: 'common',
    },
    {
      id: 'constante',
      icon: '🔥',
      name: 'El Constante',
      description: 'Mantén una racha de 7 días',
      unlocked: streak >= 7,
      rarity: 'common',
    },
    {
      id: 'veterano',
      icon: '⭐',
      name: 'Veterano',
      description: 'Alcanza el nivel 10',
      unlocked: level >= 10,
      rarity: 'rare',
    },
    {
      id: 'incansable',
      icon: '⚡',
      name: 'El Incansable',
      description: 'Mantén una racha de 30 días',
      unlocked: streak >= 30,
      rarity: 'rare',
    },
    {
      id: 'titan',
      icon: '💪',
      name: 'Titán de Hierro',
      description: 'STR ≥ 50',
      unlocked: (c.statStr ?? 0) >= 50,
      rarity: 'rare',
    },
    {
      id: 'mente',
      icon: '🧠',
      name: 'Mente Brillante',
      description: 'INT ≥ 50',
      unlocked: (c.statInt ?? 0) >= 50,
      rarity: 'rare',
    },
    {
      id: 'cuerpo_acero',
      icon: '🛡️',
      name: 'Cuerpo de Acero',
      description: 'VIT ≥ 50',
      unlocked: (c.statVit ?? 0) >= 50,
      rarity: 'rare',
    },
    {
      id: 'voluntad',
      icon: '🎯',
      name: 'Voluntad de Hierro',
      description: 'DIS ≥ 50',
      unlocked: (c.statDis ?? 0) >= 50,
      rarity: 'rare',
    },
    {
      id: 'oraculo',
      icon: '🔮',
      name: 'Oráculo',
      description: 'WIS ≥ 50',
      unlocked: (c.statWis ?? 0) >= 50,
      rarity: 'epic',
    },
    {
      id: 'magnate',
      icon: '💰',
      name: 'Magnate',
      description: 'GOL ≥ 50',
      unlocked: (c.statGol ?? 0) >= 50,
      rarity: 'epic',
    },
    {
      id: 'resurrecto',
      icon: '💀',
      name: 'El Resurrecto',
      description: 'Sobrevive tu primera muerte',
      unlocked: (c.deathCount ?? 0) >= 1,
      rarity: 'epic',
    },
    {
      id: 'combo_iniciado',
      icon: '🔗',
      name: 'Combo Iniciado',
      description: 'Activa el combo 3 días seguidos',
      unlocked: (c.comboStreak ?? 0) >= 3,
      rarity: 'epic',
    },
    {
      id: 'combo_master',
      icon: '🌊',
      name: 'Combo Master',
      description: 'Activa el combo 10 días seguidos',
      unlocked: (c.comboStreak ?? 0) >= 10,
      rarity: 'legendary',
    },
    {
      id: 'maestro',
      icon: '🏆',
      name: 'Maestro',
      description: 'Alcanza el nivel 20',
      unlocked: level >= 20,
      rarity: 'legendary',
    },
    {
      id: 'leyenda',
      icon: '👑',
      name: 'Leyenda',
      description: 'Diamond + racha de 30 días',
      unlocked: c.rank === 'Diamond' && streak >= 30,
      rarity: 'legendary',
    },
  ]
}

/* ─── Achievement Card ────────────────────────────────────────────── */
function AchievementCard({ a, delay }: { a: Achievement; delay: number }) {
  const s = RARITY_STYLES[a.rarity]
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className={`relative rounded-xl border p-3 flex flex-col items-center gap-1.5 transition-all
        ${a.unlocked ? `${s.border} ${s.glow} ${s.bg}` : 'border-[#1E1E1E] bg-[#0D0D0D] opacity-50 grayscale'}`}
    >
      {/* Rarity dot */}
      {a.unlocked && (
        <span className={`absolute top-2 right-2 text-[9px] font-bold uppercase tracking-widest ${s.badge}`}>
          {a.rarity === 'legendary' ? '★' : a.rarity === 'epic' ? '◆' : a.rarity === 'rare' ? '●' : '·'}
        </span>
      )}

      {/* Lock overlay */}
      {!a.unlocked && (
        <span className="absolute top-2 right-2 text-gray-700">
          <Lock size={10} />
        </span>
      )}

      <span className="text-2xl leading-none">{a.icon}</span>
      <p className={`text-[11px] font-bold text-center leading-tight ${a.unlocked ? 'text-white' : 'text-gray-600'}`}>
        {a.name}
      </p>
      <p className="text-[9px] text-gray-600 text-center leading-tight">{a.description}</p>
    </motion.div>
  )
}

/* ─── Panel ──────────────────────────────────────────────────────── */
export default function RewardsPanel() {
  const { data: character } = useQuery<RPGCharacter>({
    queryKey: ['rpg-character'],
    queryFn: () => rpgApi.character().then((r) => r.data.character as RPGCharacter),
    staleTime: 60_000,
    retry: false,
  })

  const achievements = useMemo(() => buildAchievements(character), [character])
  const unlocked = achievements.filter((a) => a.unlocked).length
  const total = achievements.length
  const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl bg-[#111111] border border-[#1E1E1E]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E1E]">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Logros</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{unlocked}/{total}</span>
          <span className="text-xs font-bold text-yellow-400">{pct}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 py-3 border-b border-[#1E1E1E]">
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-yellow-600 to-yellow-400"
          />
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5">
          {unlocked === total ? '🎉 ¡Todos desbloqueados! Eres una leyenda.' : `${total - unlocked} logros por desbloquear`}
        </p>
      </div>

      {/* Legend */}
      <div className="px-5 py-2 border-b border-[#1E1E1E] flex items-center gap-4">
        {(['common', 'rare', 'epic', 'legendary'] as const).map((r) => (
          <span key={r} className={`text-[9px] font-bold uppercase tracking-widest ${RARITY_STYLES[r].badge}`}>
            {r === 'legendary' ? '★' : r === 'epic' ? '◆' : r === 'rare' ? '●' : '·'} {r === 'common' ? 'común' : r === 'rare' ? 'raro' : r === 'epic' ? 'épico' : 'legendario'}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="p-5 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {achievements.map((a, i) => (
          <AchievementCard key={a.id} a={a} delay={i * 0.03} />
        ))}
      </div>
    </motion.div>
  )
}
