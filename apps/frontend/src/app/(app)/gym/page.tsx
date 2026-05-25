'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import XPFloat from '@/components/rpg/XPFloat';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import {
  Dumbbell,
  Plus,
  Trophy,
  BarChart2,
  CalendarDays,
  Clock,
  Weight,
  TrendingUp,
  Activity,
  X,
  Timer,
  Flame,
  Trash2,
  Check,
  Layers,
} from 'lucide-react';
import { format, isValid } from 'date-fns';

function safeFormat(dateVal: unknown, fmt: string, fallback = '—'): string {
  try {
    const d = new Date(dateVal as string)
    return isValid(d) ? format(d, fmt) : fallback
  } catch { return fallback }
}
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  BarChart,
  Bar,
} from 'recharts';
import { gymApi, cardioApi, getLocalDate } from '@/lib/api';
import type { GymSession, Exercise, PersonalRecord } from '@/types';
import QuickLogModal from '@/components/gym/QuickLogModal';
import ExerciseCard from '@/components/gym/ExerciseCard';
import toast from 'react-hot-toast';

/* ─── Split config ──────────────────────────────────────────────────── */
interface SplitConfig {
  id: string
  label: string
  sessionName: string
  emoji: string
  description: string
  lifts: string[]
}

const UL_SPLITS: SplitConfig[] = [
  {
    id: 'upper',
    label: 'Upper Body',
    sessionName: 'Upper Day',
    emoji: '💪',
    description: 'Pecho · Espalda · Hombros · Brazos',
    lifts: ['Banca', 'Press Militar', 'Press Inclinado'],
  },
  {
    id: 'lower',
    label: 'Lower Body',
    sessionName: 'Lower Day',
    emoji: '🦵',
    description: 'Cuádriceps · Isquiotibiales · Glúteos',
    lifts: ['Sentadilla', 'Peso Muerto Rumano', 'Prensa de Pierna'],
  },
]

const PPL_SPLITS: SplitConfig[] = [
  {
    id: 'push',
    label: 'Push',
    sessionName: 'Push Day',
    emoji: '🔺',
    description: 'Pecho · Hombros · Tríceps',
    lifts: ['Banca', 'Press Militar', 'Press Inclinado'],
  },
  {
    id: 'pull',
    label: 'Pull',
    sessionName: 'Pull Day',
    emoji: '🔻',
    description: 'Espalda · Bíceps · Dorsales',
    lifts: ['Peso Muerto', 'Remo con Barra', 'Dominadas'],
  },
  {
    id: 'leg',
    label: 'Leg',
    sessionName: 'Leg Day',
    emoji: '🦵',
    description: 'Cuádriceps · Isquiotibiales · Glúteos',
    lifts: ['Sentadilla', 'Peso Muerto Rumano', 'Prensa de Pierna'],
  },
]

/* ─── Split Log Modal ───────────────────────────────────────────────── */
function SplitLogModal({ split, open, onClose, onSave }: {
  split: SplitConfig | null
  open: boolean
  onClose: () => void
  onSave: (lift: string, weight: number) => void
}) {
  const [selectedLift, setSelectedLift] = useState<string>('')
  const [weight, setWeight] = useState('')

  useEffect(() => {
    if (open && split) {
      setSelectedLift(split.lifts[0])
      setWeight('')
    }
  }, [open, split])

  if (!split) return null

  const w = parseFloat(weight)
  const ready = selectedLift !== '' && !isNaN(w) && w > 0

  function handleSave() {
    if (!ready) return
    onSave(selectedLift, w)
    setSelectedLift('')
    setWeight('')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={onClose}
          >
            <div
              className="bg-[#111111] border border-[#1A1A1A] rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{split.emoji}</span>
                  <div>
                    <h2 className="text-base font-bold text-white leading-none">{split.label}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{split.description}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Compound lift selection */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Ejercicio Básico</p>
                <div className="flex flex-wrap gap-2">
                  {split.lifts.map((lift) => (
                    <button
                      key={lift}
                      onClick={() => setSelectedLift(lift)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                        selectedLift === lift
                          ? 'border-[#DC143C] bg-[#DC143C]/20 text-white'
                          : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      {lift}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight input */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Peso cargado (kg)</p>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="1"
                    max="999"
                    step="0.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="ej. 80"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-center text-3xl font-black focus:outline-none focus:border-[#DC143C]/50 placeholder:text-gray-700 transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 text-sm font-semibold pointer-events-none">kg</span>
                </div>
              </div>

              <motion.button
                whileHover={ready ? { scale: 1.02 } : {}}
                whileTap={ready ? { scale: 0.98 } : {}}
                onClick={handleSave}
                disabled={!ready}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
                  ready
                    ? 'bg-[#DC143C] text-white'
                    : 'bg-white/5 text-gray-600 cursor-not-allowed'
                }`}
                style={ready ? { boxShadow: '0 0 20px rgba(220,20,60,0.3)' } : {}}
              >
                {ready ? `Registrar ${selectedLift} — ${w}kg` : 'Ingresa el peso'}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ─── Split Card ────────────────────────────────────────────────────── */
function SplitCard({ split, loggedSession, onLog, compact = false }: {
  split: SplitConfig
  loggedSession: GymSession | undefined
  onLog: () => void
  compact?: boolean
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onLog}
      className={`relative w-full text-left rounded-2xl border transition-all ${
        compact ? 'p-4' : 'p-5'
      } ${
        loggedSession
          ? 'border-green-500/40 bg-green-500/8'
          : 'border-white/10 bg-white/5 hover:border-[#DC143C]/30 hover:bg-white/8'
      }`}
    >
      {loggedSession && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      <div className={`${compact ? 'text-2xl mb-2' : 'text-3xl mb-3'}`}>{split.emoji}</div>
      <h3 className={`font-bold text-white ${compact ? 'text-sm' : 'text-base'}`}>{split.label}</h3>
      <p className="text-xs text-gray-500 mt-1 leading-snug">{split.description}</p>
      {loggedSession ? (
        <div className="mt-2.5 text-xs text-green-400 font-semibold flex items-center gap-1">
          <Check className="w-3 h-3" />
          {loggedSession.notes ?? 'Registrado hoy'}
        </div>
      ) : (
        <div className="mt-2.5 text-xs text-gray-600">Toca para registrar</div>
      )}
    </motion.button>
  )
}

/* ─── Cardio config ─────────────────────────────────────────────────── */
const CARDIO_TYPES = [
  { id: 'running',  label: 'Correr',   emoji: '🏃' },
  { id: 'cycling',  label: 'Ciclismo', emoji: '🚴' },
  { id: 'swimming', label: 'Natación', emoji: '🏊' },
  { id: 'walking',  label: 'Caminar',  emoji: '🚶' },
  { id: 'hiit',     label: 'HIIT',     emoji: '⚡' },
  { id: 'other',    label: 'Otro',     emoji: '💪' },
]
const CARDIO_DURATIONS = [15, 20, 30, 45, 60, 90]

interface CardioSession {
  id: string; date: string; type: string; duration: number; distance?: number; calories?: number;
}

/* ─── Cardio Modal ──────────────────────────────────────────────────── */
function QuickCardioModal({ open, onClose, onSave }: {
  open: boolean; onClose: () => void; onSave: (d: object) => void
}) {
  const [type, setType]         = useState<string | null>(null)
  const [duration, setDuration] = useState<number | null>(null)

  function handleSave() {
    if (!type || !duration) return
    onSave({ type, duration, date: new Date().toISOString().split('T')[0] })
    setType(null); setDuration(null); onClose()
  }

  const ready = type !== null && duration !== null
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl w-full max-w-sm max-h-[90dvh] overflow-y-auto shadow-2xl p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#DC143C]" />
                  <h2 className="text-lg font-bold text-white">Registrar Cardio</h2>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Actividad</p>
                <div className="grid grid-cols-3 gap-2">
                  {CARDIO_TYPES.map((t) => (
                    <motion.button key={t.id} whileTap={{ scale: 0.95 }} onClick={() => setType(t.id)}
                      className={`py-3 rounded-xl border text-center transition-all ${
                        type === t.id ? 'border-[#DC143C] bg-[#DC143C]/20 text-white' : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                      }`}>
                      <div className="text-xl mb-0.5">{t.emoji}</div>
                      <div className="text-xs font-semibold">{t.label}</div>
                    </motion.button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Duración</p>
                <div className="grid grid-cols-3 gap-2">
                  {CARDIO_DURATIONS.map((d) => (
                    <motion.button key={d} whileTap={{ scale: 0.95 }} onClick={() => setDuration(d)}
                      className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                        duration === d ? 'border-[#DC143C] bg-[#DC143C]/20 text-white' : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                      }`}>
                      {d} min
                    </motion.button>
                  ))}
                </div>
              </div>
              <motion.button whileHover={ready ? { scale: 1.02 } : {}} whileTap={ready ? { scale: 0.98 } : {}}
                onClick={handleSave} disabled={!ready}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${ready ? 'bg-[#DC143C] text-white' : 'bg-white/5 text-gray-600 cursor-not-allowed'}`}
                style={ready ? { boxShadow: '0 0 20px rgba(220,20,60,0.3)' } : {}}>
                Guardar
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ─── Loading Skeleton ──────────────────────────────────────────────── */
function GymSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 rounded-2xl bg-white/5" />
      ))}
    </div>
  );
}

/* ─── Week Calendar ─────────────────────────────────────────────────── */
function WeekCalendar({ sessions }: { sessions: GymSession[] }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    return d;
  });

  const sessionDates = new Set(sessions.map((s) => s.date.split('T')[0]));

  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-6">
      {days.map((day, i) => {
        const dateStr = day.toISOString().split('T')[0];
        const hasSession = sessionDates.has(dateStr);
        const isToday = dateStr === today.toISOString().split('T')[0];
        return (
          <div key={i} className={`rounded-xl p-3 text-center border transition-all ${
            isToday ? 'border-[#DC143C]/50 bg-[#DC143C]/10' : hasSession ? 'border-green-500/30 bg-green-500/10' : 'border-white/5 bg-white/3'
          }`}>
            <div className="text-xs text-gray-500 mb-1">{format(day, 'EEE')}</div>
            <div className={`text-sm font-bold ${isToday ? 'text-[#DC143C]' : 'text-gray-300'}`}>{format(day, 'd')}</div>
            {hasSession && <div className="w-1.5 h-1.5 rounded-full bg-green-400 mx-auto mt-1" />}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function GymPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen]           = useState(false);
  const [cardioModalOpen, setCardioModalOpen] = useState(false)
  const [splitModalOpen, setSplitModalOpen] = useState(false)
  const [selectedSplit, setSelectedSplit]   = useState<SplitConfig | null>(null)
  const [xpFloat, setXpFloat]               = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });

  const todayStr = getLocalDate()

  const { data: sessionsData, isLoading: loadingSessions } = useQuery({
    queryKey: ['gym-sessions'],
    queryFn: async () => {
      const res = await gymApi.sessions();
      const raw: any[] = res.data?.sessions ?? res.data ?? [];
      return raw.map((s: any) => ({
        ...s,
        exercises: (s.exercises ?? s.sessionExercises ?? []).map((se: any) => ({
          exerciseId:   se.exercise?.id   ?? se.exerciseId   ?? '',
          exerciseName: se.exercise?.name ?? se.exerciseName ?? '',
          muscleGroups: se.exercise?.muscleGroups ?? se.muscleGroups ?? [],
          sets:         se.sets ?? [],
        })),
      })) as GymSession[];
    },
  });

  const { data: exercisesData } = useQuery({
    queryKey: ['gym-exercises'],
    queryFn: async () => {
      const res = await gymApi.exercises();
      return (res.data?.exercises ?? res.data) as Exercise[];
    },
  });

  const { data: recordsData } = useQuery({
    queryKey: ['gym-records'],
    queryFn: async () => {
      const res = await gymApi.records();
      return (res.data?.records ?? res.data) as PersonalRecord[];
    },
  });

  const { data: cardioData, isLoading: loadingCardio } = useQuery({
    queryKey: ['cardio-sessions'],
    queryFn: async () => {
      const res = await cardioApi.sessions()
      return (res.data.sessions ?? res.data) as CardioSession[]
    },
  })

  const createCardioMutation = useMutation({
    mutationFn: (d: object) => cardioApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cardio-sessions'] })
      qc.invalidateQueries({ queryKey: ['rpg-character'] })
      qc.invalidateQueries({ queryKey: ['rpg-combo'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('¡Sesión de cardio guardada!')
    },
    onError: () => toast.error('Error al guardar'),
  })

  const removeCardioMutation = useMutation({
    mutationFn: (id: string) => cardioApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cardio-sessions'] }),
  })

  const logSplitMutation = useMutation({
    mutationFn: (d: object) => gymApi.logSplit(d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['gym-sessions'] })
      qc.invalidateQueries({ queryKey: ['rpg-character'] })
      qc.invalidateQueries({ queryKey: ['rpg-combo'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      const xp: number = res.data?.xpAwarded ?? 0
      if (xp > 0) setXpFloat({ show: true, amount: xp })
      toast.success('¡Sesión registrada!')
    },
    onError: () => toast.error('Error al registrar sesión'),
  })

  const sessionList  = Array.isArray(sessionsData)  ? sessionsData  : [];
  const exerciseList = Array.isArray(exercisesData) ? exercisesData : [];
  const recordList   = Array.isArray(recordsData)   ? recordsData   : [];
  const cardioList   = Array.isArray(cardioData)    ? cardioData    : []

  const weekMs = 7 * 24 * 60 * 60 * 1000
  const weekCardio = cardioList.filter(s => Date.now() - new Date(s.date).getTime() < weekMs)
  const weekCardioMinutes = weekCardio.reduce((sum, s) => sum + s.duration, 0)

  const cardioTypeInfo = (type: string) => CARDIO_TYPES.find(t => t.id === type) ?? { emoji: '💪', label: type }

  function splitLoggedToday(split: SplitConfig): GymSession | undefined {
    return sessionList.find(s => s.name === split.sessionName && s.date.startsWith(todayStr))
  }

  function handleSplitLog(lift: string, weight: number) {
    if (!selectedSplit) return
    logSplitMutation.mutate({
      splitId:      selectedSplit.id,
      splitName:    selectedSplit.sessionName,
      compoundLift: lift,
      weight,
      localDate:    todayStr,
    })
  }

  function openSplit(split: SplitConfig) {
    setSelectedSplit(split)
    setSplitModalOpen(true)
  }

  return (
    <div className="space-y-6 pb-8 relative">
      <XPFloat
        amount={xpFloat.amount}
        active={xpFloat.show}
        onComplete={() => setXpFloat((f) => ({ ...f, show: false }))}
        className="top-4 left-1/2"
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 uppercase tracking-wide">
            <Dumbbell className="w-7 h-7 text-[#DC143C]" />
            Forja
          </h1>
          <p className="text-gray-500 mt-1">Forja tu cuerpo en el fuego del esfuerzo</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#DC143C] rounded-xl text-white font-semibold text-sm flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Registrar Sesión</span>
          <span className="sm:hidden">Sesión</span>
        </motion.button>
      </div>

      <Tabs.Root defaultValue="splits">
        <Tabs.List className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10 mb-6 overflow-x-auto scrollbar-none">
          {[
            { value: 'splits',    label: 'Rutinas',  icon: Layers },
            { value: 'sessions',  label: 'Hazañas',  icon: CalendarDays },
            { value: 'exercises', label: 'Arsenal',  icon: Dumbbell },
            { value: 'records',   label: 'Leyendas', icon: Trophy },
            { value: 'stats',     label: 'Stats',    icon: BarChart2 },
            { value: 'cardio',    label: 'Campo',    icon: Activity },
          ].map(({ value, label, icon: Icon }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 data-[state=active]:bg-[#DC143C] data-[state=active]:text-white transition-all whitespace-nowrap flex-shrink-0"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Rutinas / Splits Tab */}
        <Tabs.Content value="splits">
          <div className="space-y-8">
            {/* Upper / Lower */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold px-1">Upper / Lower</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {UL_SPLITS.map((split) => (
                  <SplitCard
                    key={split.id}
                    split={split}
                    loggedSession={splitLoggedToday(split)}
                    onLog={() => openSplit(split)}
                  />
                ))}
              </div>
            </div>

            {/* Push / Pull / Leg */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold px-1">Push / Pull / Leg</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {PPL_SPLITS.map((split) => (
                  <SplitCard
                    key={split.id}
                    split={split}
                    loggedSession={splitLoggedToday(split)}
                    onLog={() => openSplit(split)}
                    compact
                  />
                ))}
              </div>
            </div>

            {/* This week tonnage from splits */}
            {(() => {
              const splitNames = [...UL_SPLITS, ...PPL_SPLITS].map(s => s.sessionName)
              const weekSplitSessions = sessionList.filter(s => {
                const sessionDate = new Date(s.date)
                const diff = Date.now() - sessionDate.getTime()
                return diff < weekMs && splitNames.includes(s.name)
              })
              const weekTonnage = weekSplitSessions.reduce((sum, s) => sum + (s.totalVolume ?? 0), 0)

              if (weekSplitSessions.length === 0) return null

              return (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">Esta semana</p>
                  <div className="flex items-end gap-6">
                    <div>
                      <div className="text-2xl font-black text-white">{weekSplitSessions.length}</div>
                      <div className="text-xs text-gray-500 mt-0.5">sesiones</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-[#DC143C]">{(weekTonnage / 1000).toFixed(2)}t</div>
                      <div className="text-xs text-gray-500 mt-0.5">tonelaje estimado</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1.5">
                        {weekSplitSessions.map((s) => (
                          <span key={s.id} className="text-xs bg-[#DC143C]/10 border border-[#DC143C]/20 text-[#DC143C] rounded-full px-2 py-0.5 font-medium">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>

          <SplitLogModal
            split={selectedSplit}
            open={splitModalOpen}
            onClose={() => setSplitModalOpen(false)}
            onSave={handleSplitLog}
          />
        </Tabs.Content>

        {/* Sessions Tab */}
        <Tabs.Content value="sessions">
          <WeekCalendar sessions={sessionList} />
          {loadingSessions ? (
            <GymSkeleton />
          ) : (
            <div className="space-y-4">
              {sessionList.map((session, idx) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5 hover:border-[#DC143C]/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-bold text-lg">{session.name}</h3>
                      <p className="text-gray-500 text-sm">{safeFormat(session.date, 'EEEE, MMM d')}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-gray-400 text-sm">
                        <Clock className="w-3.5 h-3.5" />{session.duration}m
                      </div>
                      <div className="flex items-center gap-1 text-gray-400 text-sm">
                        <Weight className="w-3.5 h-3.5" />{(session.totalVolume / 1000).toFixed(1)}t vol.
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {session.exercises.map((ex) => (
                      <span key={ex.exerciseId} className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1 text-gray-400">
                        {ex.exerciseName} · {ex.sets.length}×
                      </span>
                    ))}
                    {session.exercises.length === 0 && session.notes && (
                      <span className="text-xs bg-[#DC143C]/10 border border-[#DC143C]/20 rounded-full px-3 py-1 text-[#DC143C] font-medium">
                        💪 {session.notes}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
              {sessionList.length === 0 && (
                <div className="text-center py-16 text-gray-600">
                  <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-semibold">Sin sesiones aún</p>
                  <p className="text-sm mt-1">Registra tu primera sesión arriba</p>
                </div>
              )}
            </div>
          )}
        </Tabs.Content>

        {/* Exercises Tab */}
        <Tabs.Content value="exercises">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exerciseList.map((ex, idx) => (
              <ExerciseCard key={ex.id} exercise={ex} delay={idx * 0.05} />
            ))}
          </div>
        </Tabs.Content>

        {/* Records Tab */}
        <Tabs.Content value="records">
          <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-4">Ejercicio</th>
                  <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-4">Peso</th>
                  <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-4">Reps</th>
                  <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-4">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recordList.map((rec, idx) => (
                  <motion.tr
                    key={rec.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`border-b border-white/5 hover:bg-white/3 transition-colors ${rec.isNew ? 'bg-yellow-400/5' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{rec.exerciseName}</span>
                        {rec.isNew && (
                          <span className="text-xs bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 rounded-full px-2 py-0.5 font-bold">NUEVO</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-white font-bold text-lg">{rec.weight}</span>
                      <span className="text-gray-500 text-sm ml-1">kg</span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-300">{rec.reps}</td>
                    <td className="px-6 py-4 text-right text-gray-500 text-sm">{safeFormat(rec.date, 'MMM d, yyyy')}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs.Content>

        {/* Stats Tab */}
        <Tabs.Content value="stats">
          {sessionList.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-semibold">Sin datos aún</p>
              <p className="text-sm mt-1">Registra sesiones para ver tus estadísticas</p>
            </div>
          ) : (() => {
            const weekVolume = sessionList.reduce<Record<string, number>>((acc, s) => {
              const w = `S${Math.ceil((new Date(s.date).getDate()) / 7)}`
              acc[w] = (acc[w] ?? 0) + (s.totalVolume ?? 0)
              return acc
            }, {})
            const volData = Object.entries(weekVolume).map(([week, volume]) => ({ week, volume }))

            const muscleCounts = sessionList.flatMap((s) =>
              s.exercises.flatMap((e) => e.muscleGroups ?? [])
            ).reduce<Record<string, number>>((acc, m) => { acc[m] = (acc[m] ?? 0) + 1; return acc }, {})
            const radarData = Object.entries(muscleCounts).map(([subject, value]) => ({ subject, value }))

            const exCounts = sessionList.flatMap((s) => s.exercises.map((e) => e.exerciseName))
              .reduce<Record<string, number>>((acc, n) => { acc[n] = (acc[n] ?? 0) + 1; return acc }, {})
            const topEx = Object.entries(exCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
              .map(([name, sessions]) => ({ name: name.split(' ')[0], sessions }))

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#DC143C]" />Volumen en el Tiempo
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={volData}>
                      <CartesianGrid stroke="#1A1A1A" vertical={false} />
                      <XAxis dataKey="week" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#111111', border: '1px solid #1A1A1A', borderRadius: 8, color: '#fff' }} />
                      <Line type="monotone" dataKey="volume" stroke="#DC143C" strokeWidth={2.5} dot={{ fill: '#DC143C', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>

                {radarData.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Frecuencia Muscular</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#1A1A1A" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 11 }} />
                        <Radar dataKey="value" stroke="#DC143C" fill="#DC143C" fillOpacity={0.25} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}

                {topEx.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6 lg:col-span-2">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Ejercicios Principales</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={topEx} barSize={40} margin={{ left: -20 }}>
                        <CartesianGrid stroke="#1A1A1A" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#111111', border: '1px solid #1A1A1A', borderRadius: 8, color: '#fff' }} />
                        <Bar dataKey="sessions" radius={[6, 6, 0, 0]} fill="#DC143C" />
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}
              </div>
            )
          })()}
        </Tabs.Content>

        {/* Campo / Cardio Tab */}
        <Tabs.Content value="cardio">
          <div className="space-y-6">
            <div className="flex justify-end">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setCardioModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#DC143C] rounded-xl text-white font-semibold text-sm"
                style={{ boxShadow: '0 0 16px rgba(220,20,60,0.35)' }}
              >
                <Plus className="w-4 h-4" />Registrar Cardio
              </motion.button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Timer className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Esta semana</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {weekCardioMinutes >= 60
                    ? `${Math.floor(weekCardioMinutes / 60)}h ${weekCardioMinutes % 60}m`
                    : `${weekCardioMinutes} min`}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">{weekCardio.length} sesiones</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total</span>
                </div>
                <div className="text-2xl font-bold text-white">{cardioList.length}</div>
                <div className="text-xs text-gray-600 mt-0.5">sesiones registradas</div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Historial</h2>
              </div>
              {loadingCardio ? (
                <div className="p-4 space-y-3 animate-pulse">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/5" />)}
                </div>
              ) : cardioList.length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin sesiones aún</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {cardioList.map((session, idx) => {
                    const meta = cardioTypeInfo(session.type)
                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#DC143C]/10 flex items-center justify-center text-xl flex-shrink-0">
                          {meta.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-white font-semibold text-sm">{meta.label}</span>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                            <span>⏱ {session.duration} min</span>
                            <span>{new Date(session.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeCardioMutation.mutate(session.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <QuickCardioModal
            open={cardioModalOpen}
            onClose={() => setCardioModalOpen(false)}
            onSave={(d) => createCardioMutation.mutate(d)}
          />
        </Tabs.Content>
      </Tabs.Root>

      <QuickLogModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onXP={(xp) => setXpFloat({ show: true, amount: xp })}
      />
    </div>
  );
}
