'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Plus, X, Trash2, Timer, Flame } from 'lucide-react'
import { cardioApi } from '@/lib/api'
import toast from 'react-hot-toast'

/* ─── Types ──────────────────────────────────────────────────────── */
interface CardioSession {
  id: string
  date: string
  type: string
  duration: number
  distance?: number
  calories?: number
}

/* ─── Config ──────────────────────────────────────────────────────── */
const TYPES = [
  { id: 'running',  label: 'Correr',   emoji: '🏃' },
  { id: 'cycling',  label: 'Ciclismo', emoji: '🚴' },
  { id: 'swimming', label: 'Natación', emoji: '🏊' },
  { id: 'walking',  label: 'Caminar',  emoji: '🚶' },
  { id: 'hiit',     label: 'HIIT',     emoji: '⚡' },
  { id: 'other',    label: 'Otro',     emoji: '💪' },
]

const DURATIONS = [15, 20, 30, 45, 60, 90]

/* ─── Quick Modal ─────────────────────────────────────────────────── */
function QuickCardioModal({ open, onClose, onSave }: {
  open: boolean
  onClose: () => void
  onSave: (data: object) => void
}) {
  const [type, setType]         = useState<string | null>(null)
  const [duration, setDuration] = useState<number | null>(null)

  function handleSave() {
    if (!type || !duration) return
    onSave({ type, duration, date: new Date().toISOString().split('T')[0] })
    setType(null)
    setDuration(null)
    onClose()
  }

  const ready = type !== null && duration !== null

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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-[#111111] border border-[#1A1A1A] rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-5 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#DC143C]" />
                  <h2 className="text-lg font-bold text-white">Registrar Cardio</h2>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Actividad</p>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map((t) => (
                    <motion.button
                      key={t.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setType(t.id)}
                      className={`py-3 rounded-xl border text-center transition-all ${
                        type === t.id
                          ? 'border-[#DC143C] bg-[#DC143C]/20 text-white'
                          : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      <div className="text-xl mb-0.5">{t.emoji}</div>
                      <div className="text-xs font-semibold">{t.label}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Duración */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Duración</p>
                <div className="grid grid-cols-3 gap-2">
                  {DURATIONS.map((d) => (
                    <motion.button
                      key={d}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setDuration(d)}
                      className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                        duration === d
                          ? 'border-[#DC143C] bg-[#DC143C]/20 text-white'
                          : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      {d} min
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <motion.button
                whileHover={ready ? { scale: 1.02 } : {}}
                whileTap={ready ? { scale: 0.98 } : {}}
                onClick={handleSave}
                disabled={!ready}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
                  ready ? 'bg-[#DC143C] text-white' : 'bg-white/5 text-gray-600 cursor-not-allowed'
                }`}
                style={ready ? { boxShadow: '0 0 20px rgba(220,20,60,0.3)' } : {}}
              >
                Guardar
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ─── Page ────────────────────────────────────────────────────────── */
export default function CardioPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['cardio-sessions'],
    queryFn: async () => {
      const res = await cardioApi.sessions()
      return (res.data.sessions ?? res.data) as CardioSession[]
    },
  })

  const createMutation = useMutation({
    mutationFn: (d: object) => cardioApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cardio-sessions'] })
      qc.invalidateQueries({ queryKey: ['rpg-character'] })
      toast.success('¡Sesión guardada!')
    },
    onError: () => toast.error('Error al guardar'),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => cardioApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cardio-sessions'] }),
  })

  const sessions = data ?? []

  // Stats
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const weekSessions = sessions.filter(
    (s) => Date.now() - new Date(s.date).getTime() < weekMs
  )
  const weekMinutes = weekSessions.reduce((sum, s) => sum + s.duration, 0)
  const totalSessions = sessions.length

  const typeInfo = (type: string) =>
    TYPES.find((t) => t.id === type) ?? { emoji: '💪', label: type }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 uppercase tracking-wide">
            <Activity className="w-8 h-8 text-[#DC143C]" />
            Campo de Batalla
          </h1>
          <p className="text-gray-500 mt-1">Entrena tu resistencia para la guerra</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#DC143C] text-white rounded-xl font-semibold text-sm"
          style={{ boxShadow: '0 0 16px rgba(220,20,60,0.35)' }}
        >
          <Plus className="w-4 h-4" />
          Registrar
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Esta semana</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {weekMinutes >= 60
              ? `${Math.floor(weekMinutes / 60)}h ${weekMinutes % 60}m`
              : `${weekMinutes} min`}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">{weekSessions.length} sesiones</div>
        </div>
        <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total</span>
          </div>
          <div className="text-2xl font-bold text-white">{totalSessions}</div>
          <div className="text-xs text-gray-600 mt-0.5">sesiones registradas</div>
        </div>
      </div>

      {/* Sessions list */}
      <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1A1A1A]">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Historial</h2>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/5" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin sesiones aún</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1A1A1A]">
            {sessions.map((session, idx) => {
              const meta = typeInfo(session.type)
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
                    onClick={() => removeMutation.mutate(session.id)}
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

      <QuickCardioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={(d) => createMutation.mutate(d)}
      />
    </div>
  )
}
