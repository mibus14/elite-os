'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Plus, X, Trash2, Timer, Zap, TrendingUp, MapPin } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { cardioApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

/* ─── Types ──────────────────────────────────────────────────────── */
interface CardioSession {
  id: string
  date: string
  type: 'running' | 'cycling' | 'swimming'
  duration: number
  distance: number
  calories: number
  avgHeartRate?: number
  notes?: string
}

/* ─── Mock Data ──────────────────────────────────────────────────── */
const mockSessions: CardioSession[] = [
  { id: '1', date: '2026-05-19', type: 'running',  duration: 35, distance: 5.2,  calories: 420, avgHeartRate: 158 },
  { id: '2', date: '2026-05-17', type: 'cycling',  duration: 60, distance: 22,   calories: 580, avgHeartRate: 142 },
  { id: '3', date: '2026-05-15', type: 'running',  duration: 28, distance: 4.0,  calories: 340, avgHeartRate: 165 },
  { id: '4', date: '2026-05-13', type: 'running',  duration: 45, distance: 7.1,  calories: 580, avgHeartRate: 155 },
  { id: '5', date: '2026-05-10', type: 'swimming', duration: 40, distance: 1.5,  calories: 450, avgHeartRate: 140 },
]

const TYPE_META = {
  running:  { emoji: '🏃', label: 'Correr',   color: '#DC143C' },
  cycling:  { emoji: '🚴', label: 'Ciclismo', color: '#3B82F6' },
  swimming: { emoji: '🏊', label: 'Natación', color: '#06B6D4' },
}

/* ─── Weekly chart data ──────────────────────────────────────────── */
function buildWeeklyData(sessions: CardioSession[]) {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const total = sessions
      .filter((s) => s.date === dateStr)
      .reduce((sum, s) => sum + s.distance, 0)
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      distance: Number(total.toFixed(1)),
    }
  })
}

/* ─── Custom Tooltip ─────────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-[#DC143C] font-bold">{payload[0].value} km</p>
    </div>
  )
}

/* ─── Log Modal ──────────────────────────────────────────────────── */
function LogCardioModal({ open, onClose, onLog }: {
  open: boolean
  onClose: () => void
  onLog: (data: object) => void
}) {
  const [form, setForm] = useState({
    type: 'running', duration: '', distance: '',
    calories: '', avgHeartRate: '', notes: '',
    date: new Date().toISOString().split('T')[0],
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.duration || !form.distance) return
    onLog({
      ...form,
      duration: Number(form.duration),
      distance: Number(form.distance),
      calories: Number(form.calories) || 0,
      avgHeartRate: Number(form.avgHeartRate) || undefined,
    })
    setForm({ type: 'running', duration: '', distance: '', calories: '', avgHeartRate: '', notes: '', date: new Date().toISOString().split('T')[0] })
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
            <h2 className="text-xl font-bold text-white">Registrar Entrenamiento</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type selector */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Tipo de Actividad</label>
              <div className="flex gap-2">
                {(['running', 'cycling', 'swimming'] as const).map((t) => {
                  const meta = TYPE_META[t]
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set('type', t)}
                      className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                        form.type === t
                          ? 'border-[#DC143C] bg-[#DC143C]/10 text-white'
                          : 'border-white/10 text-gray-500 hover:border-white/20'
                      }`}
                    >
                      <span className="text-xl">{meta.emoji}</span>
                      <span className="text-xs">{meta.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <Input label="Fecha" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Duración (min)" type="number" value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="35" />
              <Input label="Distancia (km)" type="number" step="0.1" value={form.distance} onChange={(e) => set('distance', e.target.value)} placeholder="5.0" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Calorías" type="number" value={form.calories} onChange={(e) => set('calories', e.target.value)} placeholder="400" />
              <Input label="FC Media (bpm)" type="number" value={form.avgHeartRate} onChange={(e) => set('avgHeartRate', e.target.value)} placeholder="155" />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Notas (opcional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="¿Cómo te fue?"
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#DC143C] resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" fullWidth onClick={onClose} type="button">Cancelar</Button>
              <Button variant="primary" fullWidth type="submit" icon={<Plus className="w-4 h-4" />}>Registrar Entrenamiento</Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function CardioPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [localSessions, setLocalSessions] = useState<CardioSession[]>(mockSessions)
  const queryClient = useQueryClient()

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['cardio-sessions'],
    queryFn: async () => {
      const res = await cardioApi.sessions()
      return res.data as CardioSession[]
    },
    placeholderData: mockSessions,
  })

  const createMutation = useMutation({
    mutationFn: (data: object) => cardioApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cardio-sessions'] }),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => cardioApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cardio-sessions'] }),
  })

  const sessions = localSessions.length > 0 ? localSessions : (sessionsData ?? mockSessions)

  const handleLog = (data: object) => {
    const s = { id: String(Date.now()), ...(data as Partial<CardioSession>) } as CardioSession
    setLocalSessions((prev) => [s, ...prev])
    createMutation.mutate(data)
  }

  const handleRemove = (id: string) => {
    setLocalSessions((prev) => prev.filter((s) => s.id !== id))
    removeMutation.mutate(id)
  }

  // Stats
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)
  const weekSessions = sessions.filter((s) => new Date(s.date) >= weekStart)
  const weekDistance = weekSessions.reduce((sum, s) => sum + s.distance, 0)
  const totalTime = sessions.reduce((sum, s) => sum + s.duration, 0)
  const totalCalories = sessions.reduce((sum, s) => sum + s.calories, 0)
  const avgPace = weekSessions.filter((s) => s.type === 'running').length > 0
    ? (weekSessions.filter((s) => s.type === 'running').reduce((s, r) => s + r.duration / r.distance, 0) /
       weekSessions.filter((s) => s.type === 'running').length).toFixed(1)
    : '—'

  const weeklyData = buildWeeklyData(sessions)

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-[#DC143C]" />
            Cardio
          </h1>
          <p className="text-gray-500 mt-1">Registra tus sesiones de resistencia</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
        >
          Registrar Entrenamiento
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Esta Semana"
          value={weekDistance.toFixed(1)}
          suffix="km"
          icon={<MapPin className="w-5 h-5 text-[#DC143C]" />}
          iconColor="bg-[#DC143C]/10"
          delay={0}
        />
        <StatCard
          label="Tiempo Total"
          value={`${Math.floor(totalTime / 60)}h ${totalTime % 60}m`}
          icon={<Timer className="w-5 h-5 text-blue-400" />}
          iconColor="bg-blue-400/10"
          delay={0.05}
        />
        <StatCard
          label="Calorías Quemadas"
          value={totalCalories.toLocaleString()}
          suffix="kcal"
          icon={<Zap className="w-5 h-5 text-yellow-400" />}
          iconColor="bg-yellow-400/10"
          delay={0.1}
        />
        <StatCard
          label="Ritmo Medio"
          value={avgPace}
          suffix={avgPace !== '—' ? 'min/km' : ''}
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          iconColor="bg-emerald-400/10"
          delay={0.15}
        />
      </div>

      {/* Weekly trend chart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4 text-[#DC143C]" />
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Distancia Semanal</h2>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={weeklyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="cardioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#DC143C" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#DC143C" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              tick={{ fill: '#6B7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6B7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="distance"
              stroke="#DC143C"
              strokeWidth={2.5}
              fill="url(#cardioGrad)"
              dot={{ fill: '#DC143C', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#DC143C', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Sessions list */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#111111] border border-[#1E1E1E] rounded-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-[#1E1E1E]">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Sesiones</h2>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/5" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Sin sesiones aún</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1E1E1E]">
            {sessions.map((session, idx) => {
              const meta = TYPE_META[session.type]
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + idx * 0.05 }}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors group"
                >
                  {/* Type icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: `${meta.color}15` }}
                  >
                    {meta.emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm">{meta.label}</span>
                      <span className="text-xs text-gray-500">{session.date}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      <span>⏱ {session.duration}min</span>
                      <span>📍 {session.distance}km</span>
                      <span>🔥 {session.calories}kcal</span>
                      {session.avgHeartRate && <span>❤️ {session.avgHeartRate}bpm</span>}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleRemove(session.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      <LogCardioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onLog={handleLog}
      />
    </div>
  )
}
