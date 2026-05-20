'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare, Plus, Flame, Star, Zap, Calendar, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { habitsApi, rpgApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card, StatCard } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import XPFloat from '@/components/rpg/XPFloat'
import type { RPGCharacter } from '@/types'

/* ─── Types ──────────────────────────────────────────────────────── */
interface Habit {
  id: string
  name: string
  icon: string
  color: string
  streak: number
  completedToday: boolean
  xpReward: number
  totalCompletions?: number
  lastCompleted?: string
}

/* ─── Mock Data ──────────────────────────────────────────────────── */
const mockHabits: Habit[] = [
  { id: '1', name: 'Morning Workout', icon: '💪', color: '#DC143C', streak: 14, completedToday: true, xpReward: 20, totalCompletions: 42, lastCompleted: '2026-05-20' },
  { id: '2', name: 'Read 30 min', icon: '📚', color: '#3B82F6', streak: 7, completedToday: false, xpReward: 10, totalCompletions: 28, lastCompleted: '2026-05-19' },
  { id: '3', name: 'Cold Shower', icon: '🚿', color: '#06B6D4', streak: 21, completedToday: true, xpReward: 15, totalCompletions: 63, lastCompleted: '2026-05-20' },
  { id: '4', name: 'Meditate', icon: '🧘', color: '#8B5CF6', streak: 5, completedToday: false, xpReward: 10, totalCompletions: 18, lastCompleted: '2026-05-19' },
  { id: '5', name: 'No Sugar', icon: '🚫', color: '#F59E0B', streak: 3, completedToday: false, xpReward: 10, totalCompletions: 11, lastCompleted: '2026-05-19' },
  { id: '6', name: '10k Steps', icon: '🦶', color: '#22C55E', streak: 10, completedToday: true, xpReward: 15, totalCompletions: 35, lastCompleted: '2026-05-20' },
]

const EMOJI_OPTIONS = ['💪', '📚', '🚿', '🧘', '🚫', '🦶', '💤', '🥗', '🧠', '🎯', '💧', '🏃', '✍️', '🎨', '🎸', '🌅', '🧹', '💊', '🚴', '🤸']
const COLOR_OPTIONS = ['#DC143C', '#3B82F6', '#06B6D4', '#8B5CF6', '#F59E0B', '#22C55E', '#EC4899', '#F97316', '#14B8A6', '#6366F1']

/* ─── Skeleton ───────────────────────────────────────────────────── */
function HabitsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />
      ))}
    </div>
  )
}

/* ─── Habit Card ─────────────────────────────────────────────────── */
function HabitCard({ habit, onComplete }: { habit: Habit; onComplete: (id: string) => void }) {
  const [justCompleted, setJustCompleted] = useState(false)

  const handleComplete = () => {
    if (habit.completedToday) return
    setJustCompleted(true)
    onComplete(habit.id)
    setTimeout(() => setJustCompleted(false), 600)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative rounded-2xl border p-5 flex flex-col gap-3 overflow-hidden cursor-pointer transition-all duration-300 ${
        habit.completedToday
          ? 'bg-emerald-950/40 border-emerald-500/30'
          : 'bg-[#111111] border-[#1E1E1E] hover:border-white/20'
      }`}
      onClick={handleComplete}
    >
      {/* Glow bg */}
      <div
        className="absolute inset-0 opacity-5 rounded-2xl"
        style={{ background: `radial-gradient(circle at top left, ${habit.color}, transparent 70%)` }}
      />

      {/* Completed overlay flash */}
      <AnimatePresence>
        {justCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 rounded-2xl z-10"
          >
            <Check className="w-12 h-12 text-emerald-400" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Icon */}
      <div className="text-4xl leading-none">{habit.icon}</div>

      {/* Name */}
      <p className="text-sm font-semibold text-white leading-snug">{habit.name}</p>

      {/* Streak badge */}
      <div className="flex items-center gap-1.5">
        <span className="text-orange-400 text-sm">🔥</span>
        <span className="text-xs font-bold text-orange-400">{habit.streak}</span>
        <span className="text-xs text-gray-500">días de racha</span>
      </div>

      {/* XP */}
      <div
        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full w-fit"
        style={{ background: `${habit.color}20`, color: habit.color }}
      >
        <Zap className="w-3 h-3" />
        +{habit.xpReward} XP
      </div>

      {/* Completed checkmark */}
      {habit.completedToday && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"
        >
          <Check className="w-3.5 h-3.5 text-white" />
        </motion.div>
      )}
    </motion.div>
  )
}

/* ─── Create Habit Modal ─────────────────────────────────────────── */
function CreateHabitModal({ open, onClose, onCreate }: {
  open: boolean
  onClose: () => void
  onCreate: (data: object) => void
}) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('💪')
  const [color, setColor] = useState('#DC143C')
  const [xpReward, setXpReward] = useState(10)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onCreate({ name, icon, color, xpReward })
    setName('')
    setIcon('💪')
    setColor('#DC143C')
    setXpReward(10)
    onClose()
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Nuevo Hábito</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Preview */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-4xl">{icon}</div>
              <div>
                <p className="text-white font-semibold">{name || 'Nombre del Hábito'}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-orange-400 text-sm">🔥</span>
                  <span className="text-xs text-gray-500">0 días de racha</span>
                </div>
              </div>
              <div
                className="ml-auto px-2 py-1 rounded-full text-xs font-bold"
                style={{ background: `${color}20`, color }}
              >
                +{xpReward} XP
              </div>
            </div>

            <Input label="Nombre del Hábito" value={name} onChange={(e) => setName(e.target.value)} placeholder="ej. Entrenamiento Matutino" />

            {/* Emoji picker */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Icono</label>
              <div className="grid grid-cols-10 gap-1">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setIcon(e)}
                    className={`text-xl p-1.5 rounded-lg transition-all ${icon === e ? 'bg-white/20 scale-110' : 'hover:bg-white/10'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${color === c ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            {/* XP Reward */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Recompensa XP: <span className="text-[#DC143C]">{xpReward}</span></label>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={xpReward}
                onChange={(e) => setXpReward(Number(e.target.value))}
                className="w-full accent-[#DC143C]"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>5</span><span>50</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" fullWidth onClick={onClose} type="button">Cancelar</Button>
              <Button variant="primary" fullWidth type="submit" icon={<Plus className="w-4 h-4" />}>Agregar Hábito</Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function HabitsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [localHabits, setLocalHabits] = useState<Habit[]>(mockHabits)
  const [xpFloat, setXpFloat] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 })
  const queryClient = useQueryClient()

  const { data: habits, isLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const res = await habitsApi.list()
      return res.data as Habit[]
    },
    placeholderData: mockHabits,
  })

  const { data: character } = useQuery<RPGCharacter>({
    queryKey: ['rpg-character'],
    queryFn: () => rpgApi.character().then((r) => r.data.character as RPGCharacter),
    staleTime: 60_000,
    retry: false,
  })

  const logMutation = useMutation({
    mutationFn: (id: string) => habitsApi.log(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      queryClient.invalidateQueries({ queryKey: ['rpg-character'] })
      const xp = res.data?.xpAwarded ?? res.data?.xp ?? 10
      setXpFloat({ show: true, amount: xp })
    },
    onError: () => {
      if ((character?.failStreak ?? 0) > 0) {
        toast.error('💀 Tu racha está en riesgo. ¡Completa tus hábitos hoy!')
      }
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: object) => habitsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habits'] }),
  })

  const habitList = (habits && habits.length > 0 ? habits : mockHabits).map((h) =>
    localHabits.find((lh) => lh.id === h.id) ?? h
  )

  const handleComplete = (id: string) => {
    setLocalHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, completedToday: true, streak: h.streak + 1 } : h))
    )
    logMutation.mutate(id)
  }

  const handleCreate = (data: object) => {
    const newHabit: Habit = {
      id: String(Date.now()),
      ...(data as Partial<Habit>),
      streak: 0,
      completedToday: false,
      totalCompletions: 0,
    } as Habit
    setLocalHabits((prev) => [...prev, newHabit])
    createMutation.mutate(data)
  }

  const displayHabits = localHabits.length > 0 ? localHabits : habitList

  const completedToday = displayHabits.filter((h) => h.completedToday).length
  const totalXpToday = displayHabits.filter((h) => h.completedToday).reduce((s, h) => s + h.xpReward, 0)
  const bestStreak = Math.max(...displayHabits.map((h) => h.streak), 0)
  const completionRate = displayHabits.length > 0 ? Math.round((completedToday / displayHabits.length) * 100) : 0

  return (
    <div className="space-y-8 pb-8 relative">
      {/* XP Float animation */}
      <XPFloat
        amount={xpFloat.amount}
        active={xpFloat.show}
        onComplete={() => setXpFloat((f) => ({ ...f, show: false }))}
        className="top-4 left-1/2"
      />

      {/* Shame banner — shown when user has a fail streak */}
      {(character?.failStreak ?? 0) > 0 && (
        <div className="bg-red-950/50 border border-red-700/30 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">💀</span>
          <div>
            <p className="text-red-400 font-bold">El Demonio de la Pereza está ganando</p>
            <p className="text-gray-500 text-sm">
              {character?.failStreak ?? 0} día{(character?.failStreak ?? 0) > 1 ? 's' : ''} sin actividad. Completa hábitos para recuperar tu racha.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 uppercase tracking-wide">
            <CheckSquare className="w-8 h-8 text-[#DC143C]" />
            Juramentos
          </h1>
          <p className="text-gray-500 mt-1">
            {completedToday}/{displayHabits.length} sellados hoy
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
        >
          Agregar Hábito
        </Button>
      </div>

      {/* Today grid */}
      {isLoading ? (
        <HabitsSkeleton />
      ) : displayHabits.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold">Sin hábitos aún</p>
          <p className="text-sm mt-1">Crea tu primer hábito para comenzar</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayHabits.map((habit, idx) => (
            <motion.div
              key={habit.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
            >
              <HabitCard habit={habit} onComplete={handleComplete} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="XP de Hoy"
          value={totalXpToday}
          suffix="XP"
          icon={<Zap className="w-5 h-5 text-yellow-400" />}
          iconColor="bg-yellow-400/10"
          delay={0.1}
        />
        <StatCard
          label="Mejor Racha"
          value={bestStreak}
          suffix="días"
          icon={<Flame className="w-5 h-5 text-orange-400" />}
          iconColor="bg-orange-400/10"
          delay={0.15}
        />
        <StatCard
          label="Tasa de Completado"
          value={completionRate}
          suffix="%"
          icon={<Star className="w-5 h-5 text-[#DC143C]" />}
          iconColor="bg-[#DC143C]/10"
          delay={0.2}
        />
      </div>

      {/* All habits table */}
      <Card delay={0.25} padding="none">
        <div className="p-5 border-b border-[#1E1E1E]">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#DC143C]" />
            Todos los Hábitos
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1E1E1E]">
                <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Hábito</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Racha</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Total</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">XP</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Última Vez</th>
              </tr>
            </thead>
            <tbody>
              {displayHabits.map((habit, idx) => (
                <motion.tr
                  key={habit.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.04 }}
                  className="border-b border-[#1E1E1E] hover:bg-white/3 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{habit.icon}</span>
                      <span className="text-white font-medium">{habit.name}</span>
                      {habit.completedToday && (
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5">Completado</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-orange-400 font-bold">🔥 {habit.streak}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-300">{habit.totalCompletions ?? 0}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-yellow-400 text-sm font-semibold">+{habit.xpReward}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-500 text-sm">{habit.lastCompleted ?? '—'}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <CreateHabitModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  )
}
