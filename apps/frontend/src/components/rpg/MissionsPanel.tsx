'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle2, Circle, ClipboardList } from 'lucide-react'
import { rpgApi } from '@/lib/rpgApi'

/* ─── Types ──────────────────────────────────────────────────────── */
interface Mission {
  id: string
  icon: string
  title: string
  description: string
  xpReward: number
  completed: boolean
  progress?: number
  progressMax?: number
  progressLabel?: string
}

/* ─── Mock fallback ──────────────────────────────────────────────── */
const mockMissions: Mission[] = [
  {
    id: 'combo',
    icon: '🔥',
    title: 'Activa el combo del día',
    description: 'Completa 2 módulos más',
    xpReward: 50,
    completed: true,
    progress: 1,
    progressMax: 3,
    progressLabel: '1/3 módulos',
  },
  {
    id: 'gym',
    icon: '⚔️',
    title: 'Entrena hoy',
    description: 'Registra 1 sesión de gym',
    xpReward: 75,
    completed: false,
  },
  {
    id: 'streak',
    icon: '🔥',
    title: 'Mantén tu racha',
    description: 'Activa cualquier módulo',
    xpReward: 30,
    completed: true,
  },
]

/* ─── Progress Bar ───────────────────────────────────────────────── */
function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-full">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="h-full rounded-full bg-[#DC143C]"
      />
    </div>
  )
}

/* ─── Mission Row ────────────────────────────────────────────────── */
function MissionRow({ mission, delay }: { mission: Mission; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35 }}
      className={`flex items-start gap-3 p-4 border-b border-[#1E1E1E] last:border-0 transition-colors ${
        mission.completed ? 'opacity-70' : ''
      }`}
    >
      {/* Icon */}
      <span className="text-xl flex-shrink-0 leading-none mt-0.5">{mission.icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${mission.completed ? 'text-gray-400 line-through' : 'text-white'}`}>
          {mission.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {mission.description} → <span className="text-yellow-400 font-medium">+{mission.xpReward} XP</span>
        </p>

        {/* Progress bar (when applicable) */}
        {typeof mission.progress === 'number' && mission.progressMax && (
          <div className="mt-2 space-y-1">
            <ProgressBar value={mission.progress} max={mission.progressMax} />
            {mission.progressLabel && (
              <p className="text-[10px] text-gray-600">{mission.progressLabel}</p>
            )}
          </div>
        )}
      </div>

      {/* Status icon */}
      <div className="flex-shrink-0 mt-0.5">
        {mission.completed ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : (
          <Circle className="w-5 h-5 text-gray-600" />
        )}
      </div>
    </motion.div>
  )
}

/* ─── Panel ──────────────────────────────────────────────────────── */
export default function MissionsPanel() {
  const { data } = useQuery<Mission[]>({
    queryKey: ['rpg-missions'],
    queryFn: () => rpgApi.missions().then((r) => r.data),
    placeholderData: mockMissions,
    refetchInterval: 60_000,
  })

  const missions: Mission[] = (data && data.length > 0 ? data : mockMissions).slice(0, 3)
  const allComplete = useMemo(() => missions.every((m) => m.completed), [missions])
  const completedCount = missions.filter((m) => m.completed).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-2xl bg-[#111111] border transition-all ${
        allComplete
          ? 'border-[#DC143C]/60 shadow-[0_0_24px_rgba(220,20,60,0.2)]'
          : 'border-[#1E1E1E]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E1E]">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-[#DC143C]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Misiones del Día</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">{completedCount}/{missions.length}</span>
          {allComplete && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-[10px] font-bold text-[#DC143C] uppercase tracking-wider"
            >
              ¡Completo!
            </motion.span>
          )}
        </div>
      </div>

      {/* Sub-header */}
      <div className="px-5 py-2 border-b border-[#1E1E1E]">
        <p className="text-xs text-gray-500">Completa misiones para ganar XP</p>
      </div>

      {/* Mission list */}
      <div>
        {missions.map((mission, idx) => (
          <MissionRow key={mission.id} mission={mission} delay={idx * 0.08} />
        ))}
      </div>

      {/* All-complete glow pulse */}
      {allComplete && (
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-2xl pointer-events-none border border-[#DC143C]/30"
        />
      )}
    </motion.div>
  )
}
