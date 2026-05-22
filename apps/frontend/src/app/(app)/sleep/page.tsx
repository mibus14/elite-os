'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Droplets, Zap, Smile, Check, Pencil, Lock } from 'lucide-react'
import { format, isValid } from 'date-fns'

function safeFormat(dateVal: unknown, fmt: string, fallback = '—'): string {
  try {
    const d = new Date(dateVal as string)
    return isValid(d) ? format(d, fmt) : fallback
  } catch { return fallback }
}
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { dailyLogApi } from '@/lib/api'
import toast from 'react-hot-toast'

/* ─── Helpers ────────────────────────────────────────────────────── */
function ScaleRow({
  label, icon: Icon, value, max, color, onChange, disabled,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  value: number
  max: number
  color: string
  onChange: (v: number) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm font-semibold text-white">{label}</span>
        <span className={`ml-auto text-lg font-black ${color}`}>{value}/{max}</span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => !disabled && onChange(n)}
            disabled={disabled}
            className={`flex-1 h-8 rounded-lg border text-xs font-bold transition-all disabled:cursor-not-allowed ${
              n <= value
                ? `border-current ${color} bg-current/10`
                : 'border-white/10 text-gray-700 hover:border-white/20'
            }`}
            style={n <= value ? { opacity: 0.6 + (n / max) * 0.4 } : undefined}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Summary card (read-only) ───────────────────────────────────── */
function TodaySummary({
  sleepHours, energyLevel, mood, waterGlasses,
  onEdit,
}: {
  sleepHours: number; energyLevel: number; mood: number; waterGlasses: number
  onEdit: () => void
}) {
  const quality = sleepHours >= 8 ? 'Excelente' : sleepHours >= 7 ? 'Bueno' : sleepHours >= 6 ? 'Regular' : 'Malo'
  const qualityColor = sleepHours >= 8 ? 'text-green-400' : sleepHours >= 7 ? 'text-blue-400' : sleepHours >= 6 ? 'text-yellow-400' : 'text-red-400'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white/5 border border-emerald-500/20 p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Registrado hoy</p>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-white/20 text-xs font-medium transition-all"
        >
          <Pencil className="w-3 h-3" /> Editar
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/[0.04] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Moon className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-gray-500">Sueño</span>
          </div>
          <p className="text-2xl font-black text-white">{sleepHours}h</p>
          <p className={`text-xs font-semibold mt-0.5 ${qualityColor}`}>{quality}</p>
        </div>
        <div className="bg-white/[0.04] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Droplets className="w-4 h-4 text-sky-400" />
            <span className="text-xs text-gray-500">Agua</span>
          </div>
          <p className="text-2xl font-black text-white">{waterGlasses}</p>
          <p className="text-xs text-gray-500 mt-0.5">vasos</p>
        </div>
        <div className="bg-white/[0.04] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-500">Energía</span>
          </div>
          <p className="text-2xl font-black text-white">{energyLevel}<span className="text-sm text-gray-500">/10</span></p>
        </div>
        <div className="bg-white/[0.04] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Smile className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-gray-500">Humor</span>
          </div>
          <p className="text-2xl font-black text-white">{mood}<span className="text-sm text-gray-500">/10</span></p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
        <Lock className="w-3 h-3 text-gray-600 flex-shrink-0" />
        <p className="text-xs text-gray-600">Un registro por día. Pulsa Editar si necesitas corregirlo.</p>
      </div>
    </motion.div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function SleepPage() {
  const qc = useQueryClient()

  const [sleepHours, setSleepHours] = useState(7)
  const [energyLevel, setEnergyLevel] = useState(5)
  const [mood, setMood] = useState(5)
  const [waterGlasses, setWaterGlasses] = useState(0)
  const [editing, setEditing] = useState(false)

  const { data: todayData, isLoading } = useQuery({
    queryKey: ['daily-log', 'today'],
    queryFn: async () => {
      const res = await dailyLogApi.today()
      return res.data.log as {
        sleepHours: number; energyLevel: number; mood: number; waterGlasses: number
      } | null
    },
  })

  const { data: weekData } = useQuery({
    queryKey: ['daily-log', 'week'],
    queryFn: async () => {
      const res = await dailyLogApi.week()
      return res.data.logs as Array<{
        date: string; sleepHours: number; energyLevel: number; mood: number; waterGlasses: number
      }>
    },
  })

  // Populate form from today's saved log
  useEffect(() => {
    if (todayData) {
      setSleepHours(todayData.sleepHours ?? 7)
      setEnergyLevel(todayData.energyLevel ?? 5)
      setMood(todayData.mood ?? 5)
      setWaterGlasses(todayData.waterGlasses ?? 0)
    }
  }, [todayData])

  const saveMutation = useMutation({
    mutationFn: () => dailyLogApi.save({ sleepHours, energyLevel, mood, waterGlasses }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-log'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Registro guardado')
      setEditing(false)
    },
    onError: () => toast.error('Error al guardar'),
  })

  const SLEEP_PRESETS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]

  const weekChart = (weekData ?? []).map((l) => ({
    day: safeFormat(l.date, 'EEE'),
    horas: l.sleepHours,
  }))

  const avgSleep = weekData && weekData.length > 0
    ? (weekData.reduce((s, l) => s + l.sleepHours, 0) / weekData.length).toFixed(1)
    : null

  // Ya registrado hoy y no está en modo edición
  const alreadySaved = !!todayData && !editing

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 uppercase tracking-wide">
            <Moon className="w-7 h-7 text-[#DC143C]" />
            Santuario
          </h1>
          <p className="text-gray-500 mt-1">Registra tu descanso diario</p>
        </div>
        {avgSleep && (
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Prom. semanal</p>
            <p className="text-2xl font-black text-white">{avgSleep}h</p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="h-48 rounded-2xl bg-white/5 animate-pulse" />
      ) : alreadySaved ? (
        /* ── Ya registrado hoy → vista resumen ── */
        <TodaySummary
          sleepHours={sleepHours}
          energyLevel={energyLevel}
          mood={mood}
          waterGlasses={waterGlasses}
          onEdit={() => setEditing(true)}
        />
      ) : (
        /* ── Formulario de registro / edición ── */
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                {editing ? 'Editar registro de hoy' : 'Registro de hoy'}
              </p>
              {editing && (
                <button
                  onClick={() => { setEditing(false); if (todayData) { setSleepHours(todayData.sleepHours); setEnergyLevel(todayData.energyLevel); setMood(todayData.mood); setWaterGlasses(todayData.waterGlasses) } }}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>

            {/* Sleep hours */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-white">Horas de sueño</span>
                <span className="ml-auto text-2xl font-black text-indigo-400">{sleepHours}h</span>
              </div>
              <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
                {SLEEP_PRESETS.map((h) => (
                  <button
                    key={h}
                    onClick={() => setSleepHours(h)}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                      sleepHours === h
                        ? 'border-indigo-400 bg-indigo-500/20 text-indigo-300'
                        : 'border-white/10 bg-white/5 text-gray-500 hover:border-white/20'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Energy / Mood */}
            <ScaleRow label="Energía" icon={Zap} value={energyLevel} max={10} color="text-yellow-400" onChange={setEnergyLevel} />
            <ScaleRow label="Humor" icon={Smile} value={mood} max={10} color="text-emerald-400" onChange={setMood} />

            {/* Water glasses */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-semibold text-white">Vasos de agua</span>
                <span className="ml-auto text-lg font-black text-sky-400">{waterGlasses}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWaterGlasses((n) => Math.max(0, n - 1))}
                  className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-lg hover:border-white/20 transition-colors flex-shrink-0"
                >−</button>
                <div className="flex flex-1 gap-1">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <div
                      key={n}
                      className={`flex-1 h-7 rounded-md transition-all ${n <= waterGlasses ? 'bg-sky-500/60' : 'bg-white/5'}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setWaterGlasses((n) => Math.min(12, n + 1))}
                  className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-lg hover:border-white/20 transition-colors flex-shrink-0"
                >+</button>
              </div>
            </div>

            {/* Save button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full py-3.5 rounded-xl bg-[#DC143C] text-white font-bold text-sm disabled:opacity-50 transition-all"
              style={{ boxShadow: '0 0 20px rgba(220,20,60,0.25)' }}
            >
              {saveMutation.isPending ? 'Guardando...' : editing ? 'Guardar cambios' : 'Guardar registro'}
            </motion.button>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Weekly sleep chart */}
      {weekChart.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-white/5 border border-white/10 p-6"
        >
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Sueño esta semana
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekChart} barSize={28} margin={{ left: -20 }}>
              <CartesianGrid stroke="#1A1A1A" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 12]} tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <ReferenceLine y={8} stroke="#6366f1" strokeDasharray="4 2" strokeOpacity={0.4} />
              <Tooltip
                contentStyle={{ background: '#111111', border: '1px solid #1A1A1A', borderRadius: 8, color: '#fff', fontSize: 12 }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                formatter={(v: number) => [`${v}h`, 'Sueño']}
              />
              <Bar dataKey="horas" radius={[6, 6, 0, 0]} fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-center text-xs text-gray-600 mt-2">La línea punteada indica el objetivo de 8h</p>
        </motion.div>
      )}
    </div>
  )
}
