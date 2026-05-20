'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Plus, X, Dumbbell, BookOpen, DollarSign, Star, Check, Calendar } from 'lucide-react'
import { goalsApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { CircleProgress } from '@/components/ui/Progress'

/* ─── Types ──────────────────────────────────────────────────────── */
interface Goal {
  id: string
  title: string
  category: 'fitness' | 'learning' | 'finance' | 'personal'
  targetValue: number
  currentValue: number
  unit: string
  deadline: string
  status: 'active' | 'completed'
  priority: 'low' | 'medium' | 'high'
}

/* ─── Mock Data ──────────────────────────────────────────────────── */
const mockGoals: Goal[] = [
  { id: '1', title: 'Bench Press 100kg', category: 'fitness', targetValue: 100, currentValue: 82, unit: 'kg', deadline: '2026-07-01', status: 'active', priority: 'high' },
  { id: '2', title: 'Read 24 Books in 2026', category: 'learning', targetValue: 24, currentValue: 11, unit: 'books', deadline: '2026-12-31', status: 'active', priority: 'medium' },
  { id: '3', title: 'Save $10,000', category: 'finance', targetValue: 10000, currentValue: 6800, unit: '$', deadline: '2026-12-31', status: 'active', priority: 'high' },
  { id: '4', title: 'Run 5K under 25min', category: 'fitness', targetValue: 25, currentValue: 27, unit: 'min', deadline: '2026-08-01', status: 'active', priority: 'medium' },
  { id: '5', title: 'Learn Spanish B2', category: 'learning', targetValue: 100, currentValue: 45, unit: '%', deadline: '2026-11-01', status: 'active', priority: 'high' },
  { id: '6', title: 'Cold Shower 90 Days', category: 'personal', targetValue: 90, currentValue: 90, unit: 'days', deadline: '2026-04-01', status: 'completed', priority: 'medium' },
]

const CATEGORY_META = {
  fitness:  { icon: Dumbbell, color: '#DC143C', bg: 'bg-[#DC143C]/10', border: 'border-[#DC143C]/20', label: 'Fitness' },
  learning: { icon: BookOpen, color: '#3B82F6', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Aprendizaje' },
  finance:  { icon: DollarSign, color: '#22C55E', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Finanzas' },
  personal: { icon: Star, color: '#8B5CF6', bg: 'bg-purple-500/10', border: 'border-purple-500/20', label: 'Personal' },
}

const PRIORITY_COLORS = {
  high:   'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low:    'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

/* ─── Deadline urgency ───────────────────────────────────────────── */
function deadlineColor(deadline: string, status: string): string {
  if (status === 'completed') return 'text-emerald-400'
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  if (days <= 14) return 'text-red-400'
  if (days <= 60) return 'text-yellow-400'
  return 'text-emerald-400'
}

/* ─── Goal Card ──────────────────────────────────────────────────── */
function GoalCard({ goal, idx, onUpdate }: { goal: Goal; idx: number; onUpdate: (id: string, value: number) => void }) {
  const [updating, setUpdating] = useState(false)
  const [newValue, setNewValue] = useState(String(goal.currentValue))

  const cat = CATEGORY_META[goal.category]
  const Icon = cat.icon
  const pct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
  const isCompleted = goal.status === 'completed' || pct >= 100

  const handleUpdate = () => {
    const val = Number(newValue)
    if (!isNaN(val) && val >= 0) {
      onUpdate(goal.id, val)
    }
    setUpdating(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.07 }}
      className={`bg-[#111111] border rounded-2xl p-5 flex flex-col gap-4 transition-all hover:border-white/20 ${
        isCompleted ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-[#1E1E1E]'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${cat.bg} ${cat.border}`}>
          <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
          <span className="text-xs font-semibold" style={{ color: cat.color }}>{cat.label}</span>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${PRIORITY_COLORS[goal.priority]}`}>
          {{ low: 'Baja', medium: 'Media', high: 'Alta' }[goal.priority]}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-white font-bold text-base leading-snug">{goal.title}</h3>

      {/* Progress ring + values */}
      <div className="flex items-center gap-4">
        <CircleProgress
          value={goal.currentValue}
          max={goal.targetValue}
          size={72}
          strokeWidth={6}
          color={isCompleted ? '#22C55E' : cat.color}
          label={
            <div className="text-center">
              <p className="text-sm font-bold text-white">{pct}%</p>
            </div>
          }
        />
        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">{goal.currentValue}</span>
            <span className="text-gray-500 text-sm">/ {goal.targetValue} {goal.unit}</span>
          </div>
          <div className={`flex items-center gap-1 mt-1 text-xs ${deadlineColor(goal.deadline, goal.status)}`}>
            <Calendar className="w-3 h-3" />
            {isCompleted ? '¡Completada!' : new Date(goal.deadline).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Update or completed */}
      {isCompleted ? (
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
          <Check className="w-4 h-4" />
          ¡Meta Lograda!
        </div>
      ) : updating ? (
        <div className="flex gap-2">
          <input
            type="number"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#DC143C]"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(); if (e.key === 'Escape') setUpdating(false) }}
          />
          <Button size="sm" variant="primary" onClick={handleUpdate}>Guardar</Button>
          <Button size="sm" variant="ghost" onClick={() => setUpdating(false)}>✕</Button>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setUpdating(true)} fullWidth>
          Actualizar Progreso
        </Button>
      )}
    </motion.div>
  )
}

/* ─── Create Goal Modal ──────────────────────────────────────────── */
function CreateGoalModal({ open, onClose, onCreate }: {
  open: boolean
  onClose: () => void
  onCreate: (data: object) => void
}) {
  const [form, setForm] = useState({
    title: '', description: '', category: 'fitness',
    targetValue: '', currentValue: '', unit: '',
    deadline: '', priority: 'medium',
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.targetValue) return
    onCreate({
      ...form,
      targetValue: Number(form.targetValue),
      currentValue: Number(form.currentValue) || 0,
      status: 'active',
    })
    setForm({ title: '', description: '', category: 'fitness', targetValue: '', currentValue: '', unit: '', deadline: '', priority: 'medium' })
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
          className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Nueva Meta</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Título de la Meta" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="ej. Press de Banca 100kg" />

            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Categoría</label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#DC143C]"
              >
                <option value="fitness">Fitness</option>
                <option value="learning">Aprendizaje</option>
                <option value="finance">Finanzas</option>
                <option value="personal">Personal</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input label="Objetivo" type="number" value={form.targetValue} onChange={(e) => set('targetValue', e.target.value)} placeholder="100" />
              <Input label="Actual" type="number" value={form.currentValue} onChange={(e) => set('currentValue', e.target.value)} placeholder="0" />
              <Input label="Unidad" value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="kg, %, $…" />
            </div>

            <Input label="Fecha Límite" type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />

            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Prioridad</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set('priority', p)}
                    className={`flex-1 py-2 text-sm rounded-xl border font-medium transition-all ${
                      form.priority === p ? PRIORITY_COLORS[p] : 'border-white/10 text-gray-500 hover:border-white/20'
                    }`}
                  >
                    {{ low: 'Baja', medium: 'Media', high: 'Alta' }[p]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" fullWidth onClick={onClose} type="button">Cancelar</Button>
              <Button variant="primary" fullWidth type="submit" icon={<Plus className="w-4 h-4" />}>Crear Meta</Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */
const FILTER_TABS = ['Todas', 'Fitness', 'Aprendizaje', 'Finanzas', 'Personal', 'Completadas'] as const
type FilterTab = typeof FILTER_TABS[number]

export default function GoalsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter] = useState<FilterTab>('Todas')
  const [localGoals, setLocalGoals] = useState<Goal[]>(mockGoals)
  const queryClient = useQueryClient()

  const { data: goalsData, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await goalsApi.list()
      return res.data as Goal[]
    },
    placeholderData: mockGoals,
  })

  const createMutation = useMutation({
    mutationFn: (data: object) => goalsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  })

  const progressMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: number }) => goalsApi.progress(id, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  })

  const goals = localGoals.length > 0 ? localGoals : (goalsData ?? mockGoals)

  const TAB_TO_CATEGORY: Record<string, string> = {
    'Fitness': 'fitness',
    'Aprendizaje': 'learning',
    'Finanzas': 'finance',
    'Personal': 'personal',
  }

  const filteredGoals = goals.filter((g) => {
    if (filter === 'Todas') return true
    if (filter === 'Completadas') return g.status === 'completed'
    return g.category === TAB_TO_CATEGORY[filter]
  })

  const handleCreate = (data: object) => {
    const newGoal = { id: String(Date.now()), ...(data as Partial<Goal>) } as Goal
    setLocalGoals((prev) => [newGoal, ...prev])
    createMutation.mutate(data)
  }

  const handleUpdate = (id: string, value: number) => {
    setLocalGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, currentValue: value, status: value >= g.targetValue ? 'completed' : 'active' } : g))
    )
    progressMutation.mutate({ id, value })
  }

  const activeCount = goals.filter((g) => g.status === 'active').length
  const completedCount = goals.filter((g) => g.status === 'completed').length

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Target className="w-8 h-8 text-[#DC143C]" />
            Metas
          </h1>
          <p className="text-gray-500 mt-1">{activeCount} activas · {completedCount} completadas</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
        >
          Nueva Meta
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10 w-fit flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === tab
                ? 'bg-[#DC143C] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Goals grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-56 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold">Sin metas aún</p>
          <p className="text-sm mt-1">Crea tu primera meta para comenzar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGoals.map((goal, idx) => (
            <GoalCard key={goal.id} goal={goal} idx={idx} onUpdate={handleUpdate} />
          ))}
        </div>
      )}

      <CreateGoalModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  )
}
