'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { rpgApi } from '@/lib/rpgApi'
import { useAuthStore } from '@/store/authStore'
import { RPGCharacter } from '@/types/rpg'

// ─── Class metadata ────────────────────────────────────────────────────────────
const CLASS_META: Record<string, { emoji: string; label: string }> = {
  Guerrero: { emoji: '⚔️',  label: 'Guerrero' },
  Monje:    { emoji: '🧘',  label: 'Monje'    },
  Sabio:    { emoji: '📚',  label: 'Sabio'    },
  Asesino:  { emoji: '🗡️', label: 'Asesino'  },
  Mercader: { emoji: '💰',  label: 'Mercader' },
}

const RANK_COLORS: Record<string, string> = {
  Bronce:   'text-amber-700',
  Plata:    'text-gray-400',
  Oro:      'text-yellow-400',
  Platino:  'text-cyan-300',
  Diamante: 'text-blue-300',
  Bronze:   'text-amber-700',
  Silver:   'text-gray-400',
  Gold:     'text-yellow-400',
  Platinum: 'text-cyan-300',
  Diamond:  'text-blue-300',
}

// ─── Attribute bar ─────────────────────────────────────────────────────────────
interface StatBarProps {
  icon:  string
  label: string
  value: number
  max?:  number
  delay?: number
}

function StatBar({ icon, label, value, max = 100, delay = 0 }: StatBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm w-4 flex-shrink-0">{icon}</span>
      <span className="text-[11px] font-bold text-gray-400 w-7 flex-shrink-0 uppercase">{label}</span>
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#B91C1C] to-[#DC143C]"
          style={{ boxShadow: '0 0 6px rgba(220,20,60,0.5)' }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1], delay }}
        />
      </div>
      <span className="text-xs font-bold text-white w-6 text-right flex-shrink-0">{value}</span>
    </div>
  )
}

// ─── Combo module chip ─────────────────────────────────────────────────────────
function ModuleChip({ label, done }: { label: string; done: boolean }) {
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
        done
          ? 'bg-[#DC143C]/20 text-[#DC143C] border border-[#DC143C]/30'
          : 'bg-white/5 text-gray-600 border border-white/10'
      }`}
    >
      {label} {done ? '✓' : ''}
    </span>
  )
}

// ─── Full stats modal ──────────────────────────────────────────────────────────
function StatsModal({
  char,
  onClose,
}: {
  char: RPGCharacter
  onClose: () => void
}) {
  const { user } = useAuthStore()
  const meta = CLASS_META[char.class] ?? { emoji: '⚔️', label: char.class }

  const xpForLevel = (lvl: number) => lvl * 500
  const xpBase     = (lvl: number) => (lvl - 1) * 500
  const xpPct      = Math.min(
    100,
    ((char.xp - xpBase(char.level)) / (xpForLevel(char.level) - xpBase(char.level))) * 100
  )

  const stats = [
    { icon: '⚔️',  label: 'FUE', value: char.statStr },
    { icon: '🧠',  label: 'INT', value: char.statInt },
    { icon: '❤️',  label: 'VIT', value: char.statVit },
    { icon: '🛡️', label: 'DIS', value: char.statDis },
    { icon: '📖',  label: 'SAB', value: char.statWis },
    { icon: '💰',  label: 'ORO', value: char.statGol },
  ]

  const combo = char.combo
  const hasDebuffs = char.debuffs && char.debuffs.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Overlay */}
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Panel */}
      <motion.div
        className="relative z-10 w-full max-w-sm bg-[#0D0D0D] border border-white/10 rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 0 40px rgba(220,20,60,0.15), 0 24px 48px rgba(0,0,0,0.6)' }}
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#DC143C]/50 flex-shrink-0"
              style={{ boxShadow: '0 0 16px rgba(220,20,60,0.35)' }}
            >
              <img
                src={
                  user?.avatar ||
                  `https://api.dicebear.com/8.x/avataaars/svg?seed=${user?.username ?? 'elite'}`
                }
                alt={user?.username}
                className="w-full h-full bg-[#1A1A1A]"
              />
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">
                {user?.username ?? 'Operador'}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {meta.emoji} {meta.label} · Nivel {char.level} ·{' '}
                <span className={RANK_COLORS[char.rank] ?? 'text-gray-400'}>{char.rank}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* XP Bar */}
        <div className="px-5 py-3 border-b border-white/[0.07]">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">
              Experiencia
            </span>
            <span className="text-[11px] text-gray-400 font-medium">
              {char.xp.toLocaleString()} / {xpForLevel(char.level).toLocaleString()} XP
            </span>
          </div>
          <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#B91C1C] to-[#DC143C]"
              style={{ boxShadow: '0 0 8px rgba(220,20,60,0.5)' }}
              initial={{ width: 0 }}
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
            />
          </div>
        </div>

        {/* Attributes */}
        <div className="px-5 py-4 border-b border-white/[0.07]">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-3">
            Atributos
          </p>
          <div className="space-y-2.5">
            {stats.map((s, i) => (
              <StatBar key={s.label} {...s} delay={0.05 * i} />
            ))}
          </div>
        </div>

        {/* Combo */}
        {combo && (
          <div className="px-5 py-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">🔥</span>
              <span className="text-xs font-bold text-white">
                {combo.comboActive
                  ? `COMBO x${combo.comboMultiplier} activo`
                  : 'Combo en progreso'}
              </span>
              {char.comboStreak > 0 && (
                <span className="ml-auto text-[10px] text-[#DC143C] font-semibold">
                  {char.comboStreak}d racha
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <ModuleChip label="Gym"       done={combo.gymDone}       />
              <ModuleChip label="Hábitos"   done={combo.habitsDone}    />
              <ModuleChip label="Nutrición" done={combo.nutritionDone} />
              <ModuleChip label="Cardio"    done={combo.cardioDone}    />
              <ModuleChip label="Estudio"   done={combo.learningDone}  />
              <ModuleChip label="Finanzas"  done={combo.financeDone}   />
            </div>
          </div>
        )}

        {/* Debuffs */}
        {hasDebuffs && (
          <div className="px-5 py-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-2">
              Debuffs activos
            </p>
            <div className="space-y-2">
              {char.debuffs.map(d => {
                const expiresAt = new Date(d.expiresAt)
                const hoursLeft = Math.max(
                  0,
                  Math.round((expiresAt.getTime() - new Date().getTime()) / 3_600_000)
                )
                return (
                  <div
                    key={d.id}
                    className="flex items-center gap-2 bg-red-900/10 border border-red-900/20 rounded-lg px-3 py-2"
                  >
                    <span className="text-base">{d.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-red-400">{d.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{d.description}</p>
                    </div>
                    <span className="text-[10px] text-gray-600 flex-shrink-0">
                      {hoursLeft}h
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Penitence badge */}
        {char.inPenitence && (
          <div className="mx-5 mb-4 mt-2 px-3 py-2 bg-orange-900/15 border border-orange-800/30 rounded-lg flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <p className="text-xs text-orange-400 font-medium">Modo Penitencia activo</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Mini panel (sidebar expanded) ────────────────────────────────────────────
function MiniPanel({
  char,
  onExpand,
}: {
  char: RPGCharacter
  onExpand: () => void
}) {
  const { user } = useAuthStore()
  const meta = CLASS_META[char.class] ?? { emoji: '⚔️', label: char.class }

  const xpPct = Math.min(
    100,
    ((char.xp - (char.level - 1) * 500) / (char.level * 500 - (char.level - 1) * 500)) * 100
  )

  return (
    <button
      onClick={onExpand}
      className="w-full text-left group"
      aria-label="Ver personaje completo"
    >
      <div
        className="mx-2 p-3 rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] hover:border-[#DC143C]/30 transition-all duration-200"
        style={{ boxShadow: 'none' }}
      >
        {/* Avatar + name */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <div
            className="w-8 h-8 rounded-full overflow-hidden border border-[#DC143C]/40 flex-shrink-0"
            style={{ boxShadow: '0 0 10px rgba(220,20,60,0.25)' }}
          >
            <img
              src={
                user?.avatar ||
                `https://api.dicebear.com/8.x/avataaars/svg?seed=${user?.username ?? 'elite'}`
              }
              alt={user?.username}
              className="w-full h-full bg-[#1A1A1A]"
            />
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {user?.username ?? 'Operador'}
            </p>
            <p className="text-[10px] text-gray-500 truncate">
              {meta.emoji} {meta.label} · Lv.{char.level}
            </p>
          </div>
          <span className="text-[9px] text-gray-600 group-hover:text-[#DC143C] transition-colors flex-shrink-0">
            ▸
          </span>
        </div>

        {/* XP bar */}
        <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#B91C1C] to-[#DC143C]"
            initial={{ width: 0 }}
            animate={{ width: `${xpPct}%` }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          />
        </div>
        <p className="text-[9px] text-gray-600 mt-1 text-right">
          {char.xp.toLocaleString()} XP
        </p>
      </div>
    </button>
  )
}

// ─── Collapsed icon ────────────────────────────────────────────────────────────
function CollapsedIcon({
  char,
  onExpand,
}: {
  char: RPGCharacter
  onExpand: () => void
}) {
  const meta = CLASS_META[char.class] ?? { emoji: '⚔️', label: char.class }

  return (
    <button
      onClick={onExpand}
      title={`${meta.label} · Nivel ${char.level}`}
      className="w-full flex flex-col items-center gap-0.5 py-2 group"
    >
      <span className="text-lg leading-none">{meta.emoji}</span>
      <span className="text-[9px] font-bold text-gray-500 group-hover:text-[#DC143C] transition-colors">
        {char.level}
      </span>
    </button>
  )
}

// ─── Public component ──────────────────────────────────────────────────────────
interface CharacterPanelProps {
  collapsed?: boolean
}

export function CharacterPanel({ collapsed = false }: CharacterPanelProps) {
  const [char, setChar]       = useState<RPGCharacter | null>(null)
  const [modalOpen, setModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    rpgApi
      .character()
      .then(res => setChar(res.data.character))
      .catch(() => {
        // Use mock data when the API is not yet available
        setChar({
          class:       'Guerrero',
          level:       1,
          xp:          0,
          rank:        'Bronce',
          statStr:     10,
          statInt:     5,
          statVit:     8,
          statDis:     5,
          statWis:     5,
          statGol:     3,
          comboStreak: 0,
          deathCount:  0,
          inPenitence: false,
          debuffs:     [],
          combo:       null,
        })
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading || !char) {
    return (
      <div className="mx-2 h-14 rounded-xl bg-white/[0.03] border border-white/[0.07] animate-pulse" />
    )
  }

  return (
    <>
      {collapsed ? (
        <CollapsedIcon char={char} onExpand={() => setModal(true)} />
      ) : (
        <MiniPanel char={char} onExpand={() => setModal(true)} />
      )}

      <AnimatePresence>
        {modalOpen && (
          <StatsModal char={char} onClose={() => setModal(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
