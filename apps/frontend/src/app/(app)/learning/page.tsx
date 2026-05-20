'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, X, Zap, Clock, Star } from 'lucide-react'
import { learningApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { Input } from '@/components/ui/Input'

/* ─── Types ──────────────────────────────────────────────────────── */
interface LearningSubject {
  subject: string
  emoji: string
  level: number
  hours: number
  xp: number
  progress: number
}

interface LearningSession {
  id: string
  date: string
  subject: string
  duration: number
  xp: number
  notes?: string
}

/* ─── Mock Data ──────────────────────────────────────────────────── */
const mockSubjects: LearningSubject[] = [
  { subject: 'Spanish',           emoji: '🇪🇸', level: 12, hours: 67,  xp: 2680, progress: 78 },
  { subject: 'JavaScript',        emoji: '⚡',  level: 18, hours: 124, xp: 4960, progress: 45 },
  { subject: 'Machine Learning',  emoji: '🤖', level: 8,  hours: 43,  xp: 1720, progress: 23 },
  { subject: 'Strength Training', emoji: '🏋️', level: 15, hours: 89,  xp: 3560, progress: 62 },
  { subject: 'Piano',             emoji: '🎹', level: 5,  hours: 28,  xp: 1120, progress: 15 },
  { subject: 'Leadership',        emoji: '👑', level: 9,  hours: 52,  xp: 2080, progress: 88 },
]

const mockSessions: LearningSession[] = [
  { id: '1', date: '2026-05-20', subject: 'Spanish',    duration: 45, xp: 180, notes: 'Worked on subjunctive tense' },
  { id: '2', date: '2026-05-19', subject: 'JavaScript', duration: 90, xp: 360, notes: 'React hooks deep dive' },
  { id: '3', date: '2026-05-18', subject: 'Spanish',    duration: 30, xp: 120 },
  { id: '4', date: '2026-05-17', subject: 'Piano',      duration: 60, xp: 240, notes: 'Scales and arpeggios' },
  { id: '5', date: '2026-05-16', subject: 'Machine Learning', duration: 120, xp: 480 },
]

const DAILY_XP_GOAL = 500
const CURRENT_XP_TODAY = 300
const CURRENT_STREAK = 21

/* ─── Log Modal ──────────────────────────────────────────────────── */
function LogStudyModal({ open, onClose, onLog, subjects }: {
  open: boolean
  onClose: () => void
  onLog: (data: object) => void
  subjects: LearningSubject[]
}) {
  const [form, setForm] = useState({
    subject: subjects[0]?.subject ?? '',
    duration: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.subject || !form.duration) return
    const dur = Number(form.duration)
    const xp = Math.round(dur * 4)
    onLog({ ...form, duration: dur, xp, id: String(Date.now()) })
    setForm({ subject: subjects[0]?.subject ?? '', duration: '', notes: '', date: new Date().toISOString().split('T')[0] })
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
            <h2 className="text-xl font-bold text-white">Registrar Sesión de Estudio</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Materia</label>
              <select
                value={form.subject}
                onChange={(e) => set('subject', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#DC143C]"
              >
                {subjects.map((s) => (
                  <option key={s.subject} value={s.subject}>{s.emoji} {s.subject}</option>
                ))}
                <option value="Other">📘 Otra</option>
              </select>
            </div>

            <Input label="Fecha" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            <Input label="Duración (minutos)" type="number" value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="45" />

            {form.duration && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-3 py-2"
              >
                <Zap className="w-4 h-4" />
                <span>+{Math.round(Number(form.duration) * 4)} XP ganados</span>
              </motion.div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Notas (opcional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="¿Qué aprendiste?"
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#DC143C] resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" fullWidth onClick={onClose} type="button">Cancelar</Button>
              <Button variant="primary" fullWidth type="submit" icon={<Plus className="w-4 h-4" />}>Registrar Sesión</Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ─── Subject Card ───────────────────────────────────────────────── */
function SubjectCard({ sub, idx }: { sub: LearningSubject; idx: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.07 }}
      whileHover={{ scale: 1.02 }}
      className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-5 hover:border-white/20 transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{sub.emoji}</span>
          <div>
            <p className="text-white font-semibold">{sub.subject}</p>
            <p className="text-xs text-gray-500">Nivel {sub.level}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-yellow-400 text-sm font-bold">{sub.xp.toLocaleString()} XP</p>
          <p className="text-xs text-gray-500">{sub.hours}h totales</p>
        </div>
      </div>

      {/* Progress to next level */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Nivel {sub.level} → {sub.level + 1}</span>
          <span>{sub.progress}%</span>
        </div>
        <Progress value={sub.progress} color="blue" size="sm" animated />
      </div>
    </motion.div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function LearningPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [localSessions, setLocalSessions] = useState<LearningSession[]>(mockSessions)
  const queryClient = useQueryClient()

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['learning-sessions'],
    queryFn: async () => {
      const res = await learningApi.sessions()
      return res.data as LearningSession[]
    },
    placeholderData: mockSessions,
  })

  const createMutation = useMutation({
    mutationFn: (data: object) => learningApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learning-sessions'] }),
  })

  const sessions = localSessions.length > 0 ? localSessions : (sessionsData ?? mockSessions)
  const xpPct = Math.min(100, Math.round((CURRENT_XP_TODAY / DAILY_XP_GOAL) * 100))

  const handleLog = (data: object) => {
    setLocalSessions((prev) => [data as LearningSession, ...prev])
    createMutation.mutate(data)
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-[#DC143C]" />
            Aprendizaje
          </h1>
          <p className="text-gray-500 mt-1">Registra tu crecimiento de conocimiento</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
        >
          Registrar Sesión
        </Button>
      </div>

      {/* Streak hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-8 flex flex-col items-center text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          className="text-6xl mb-3"
        >
          🔥
        </motion.div>
        <h2 className="text-5xl font-black text-white mb-1">
          {CURRENT_STREAK}
          <span className="text-[#DC143C]"> día</span>
        </h2>
        <p className="text-gray-400 text-lg">racha de aprendizaje</p>
        <p className="text-xs text-gray-600 mt-2">¡No rompas la cadena!</p>
      </motion.div>

      {/* Daily XP goal bar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Meta Diaria de XP</h2>
          </div>
          <span className="text-yellow-400 font-bold text-sm">{CURRENT_XP_TODAY} / {DAILY_XP_GOAL} XP</span>
        </div>

        {/* Duolingo-style bar */}
        <div className="relative h-8 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpPct}%` }}
            transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-400 flex items-center justify-end pr-3"
            style={{ boxShadow: '0 0 12px rgba(250,204,21,0.5)' }}
          >
            {xpPct > 15 && (
              <span className="text-yellow-900 text-xs font-black">{xpPct}%</span>
            )}
          </motion.div>
        </div>

        {xpPct >= 100 ? (
          <p className="text-emerald-400 text-xs mt-2 font-semibold flex items-center gap-1">
            <Star className="w-3 h-3" /> ¡Meta diaria completada! XP bonus ganados.
          </p>
        ) : (
          <p className="text-gray-500 text-xs mt-2">{DAILY_XP_GOAL - CURRENT_XP_TODAY} XP para alcanzar tu meta diaria</p>
        )}
      </motion.div>

      {/* Subjects grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#DC143C]" />
          Materias
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {mockSubjects.map((sub, idx) => (
            <SubjectCard key={sub.subject} sub={sub} idx={idx} />
          ))}
        </div>
      </div>

      {/* Recent sessions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-[#111111] border border-[#1E1E1E] rounded-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-[#1E1E1E]">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Sesiones Recientes</h2>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/5" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Sin sesiones aún</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1E1E1E]">
            {sessions.slice(0, 10).map((session, idx) => {
              const sub = mockSubjects.find((s) => s.subject === session.subject)
              const emoji = sub?.emoji ?? '📘'
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + idx * 0.04 }}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/3 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-lg flex-shrink-0">
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-semibold">{session.subject}</span>
                      <span className="text-xs text-gray-500">{session.date}</span>
                    </div>
                    {session.notes && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{session.notes}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-yellow-400 text-xs font-bold">+{session.xp} XP</div>
                    <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                      <Clock className="w-3 h-3" />
                      {session.duration}m
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      <LogStudyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onLog={handleLog}
        subjects={mockSubjects}
      />
    </div>
  )
}
