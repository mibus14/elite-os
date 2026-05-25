'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Sword, Plus, X, Zap, Clock, Users, ChevronDown, Eye, History } from 'lucide-react'
import { betsApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

/* ─── Types ──────────────────────────────────────────────────────── */
interface Acceptance {
  id: string; userId: string; amount: number; status: string
  user: { id: string; username: string }
}
interface Bet {
  id: string; title: string; conditionType: string; conditionValue: number
  stake: number; currency: string; deadline: string; status: string
  result: boolean | null; xpReward: number; createdAt: string; settledAt?: string
  creator: { id: string; username: string; avatar?: string }
  acceptances: Acceptance[]
}

/* ─── Helpers ────────────────────────────────────────────────────── */
const CONDITION_LABELS: Record<string, string> = {
  gym_sessions:      'sesiones de gym',
  cardio_sessions:   'sesiones de cardio',
  habit_days:        'días con hábitos',
  streak_days:       'días de racha',
  active_days:       'días activos',
  nutrition_healthy: '% de comidas saludables',
}

const CONDITION_HINT: Record<string, string> = {
  gym_sessions:      'ej. 5 → ir al gym 5 veces',
  cardio_sessions:   'ej. 3 → 3 sesiones de cardio',
  habit_days:        'ej. 5 → hábitos 5 días',
  streak_days:       'ej. 7 → racha de 7 días',
  active_days:       'ej. 4 → activo 4 días',
  nutrition_healthy: 'ej. 70 → 70% comidas sanas',
}

const XP_BY_STAKE = (s: number) => s < 10 ? 50 : s < 25 ? 100 : s < 50 ? 200 : s < 100 ? 350 : 500

function fmt(amount: number, currency: string) {
  return `${currency} ${amount % 1 === 0 ? amount : amount.toFixed(2)}`
}

function timeLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff <= 0) return 'Vencido'
  const days  = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ─── Accept Modal ────────────────────────────────────────────────── */
function AcceptModal({ open, bet, onClose, onAccept }: {
  open: boolean; bet: Bet | null; onClose: () => void
  onAccept: (betId: string, amount: number) => void
}) {
  const [amount, setAmount] = useState('')
  const num = parseFloat(amount) || 0

  function handleAccept() {
    if (!bet || num <= 0) return
    onAccept(bet.id, num)
    setAmount('')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && bet && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#0D0D0D] border border-yellow-500/20 rounded-2xl w-full max-w-xs shadow-2xl p-6 space-y-4"
              style={{ boxShadow: '0 0 40px rgba(234,179,8,0.1)' }}
              onClick={e => e.stopPropagation()}>
              <div className="text-center space-y-1">
                <div className="text-3xl">⚔️</div>
                <h2 className="text-lg font-black text-yellow-400 tracking-wide uppercase">Aceptar Duelo</h2>
                <p className="text-xs text-gray-500">Demostrarás que caerá en combate</p>
              </div>
              <div className="bg-white/5 border border-white/8 rounded-xl p-3 text-sm text-gray-400">
                <span className="text-yellow-400 font-bold">⚔ {bet.creator.username}</span> apuesta{' '}
                <span className="text-[#DC143C] font-bold">{fmt(bet.stake, bet.currency)}</span> a que cumple:{' '}
                <span className="text-gray-300 italic">"{bet.title}"</span>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Tu apuesta en juego</p>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="0" min="0.01" autoFocus
                  className="w-full bg-black border border-yellow-500/20 rounded-xl px-4 py-3 text-yellow-400 text-2xl font-black text-center focus:outline-none focus:border-yellow-500/50 transition-all" />
                <p className="text-xs text-gray-600 text-center">
                  Si cae — recuperas tu apuesta + parte proporcional de {fmt(bet.stake, bet.currency)}
                </p>
              </div>
              <motion.button whileHover={num > 0 ? { scale: 1.02 } : {}} whileTap={num > 0 ? { scale: 0.98 } : {}}
                onClick={handleAccept} disabled={num <= 0}
                className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${
                  num > 0 ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-600 cursor-not-allowed'
                }`}
                style={num > 0 ? { boxShadow: '0 0 20px rgba(234,179,8,0.4)' } : {}}>
                ⚔ Entrar al Coliseo
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ─── Create Modal ────────────────────────────────────────────────── */
function CreateChallengeModal({ open, onClose, onCreate }: {
  open: boolean; onClose: () => void; onCreate: (data: object) => void
}) {
  const [title,     setTitle]     = useState('')
  const [condition, setCondition] = useState('gym_sessions')
  const [value,     setValue]     = useState('5')
  const [stake,     setStake]     = useState('')
  const [currency,  setCurrency]  = useState('USD')
  const [deadline,  setDeadline]  = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  })

  const stakeNum = parseFloat(stake) || 0
  const xp = XP_BY_STAKE(stakeNum)
  const ready = title.trim() && stakeNum > 0 && parseInt(value) > 0

  function handleCreate() {
    if (!ready) return
    onCreate({ title, conditionType: condition, conditionValue: parseInt(value), stake: stakeNum, currency, deadline })
    setTitle(''); setStake(''); setValue('5'); setCondition('gym_sessions')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#0D0D0D] border border-[#DC143C]/30 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 max-h-[90dvh] overflow-y-auto"
              style={{ boxShadow: '0 0 40px rgba(220,20,60,0.1)' }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-wide">⚔ Lanzar Desafío</h2>
                  <p className="text-xs text-gray-600 mt-0.5">Reta a los gladiadores del coliseo</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Tu juramento de combate</p>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="ej. Conquistaré 5 sesiones de gym esta semana"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-700 text-sm focus:outline-none focus:border-[#DC143C]/50 transition-all" autoFocus />
              </div>

              <div className="space-y-2">
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Hazaña a cumplir</p>
                  <select value={condition} onChange={e => { setCondition(e.target.value); setValue(e.target.value === 'nutrition_healthy' ? '70' : '5') }}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#DC143C]/50 transition-all">
                    {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    {condition === 'nutrition_healthy' ? 'Mínimo % saludable' : 'Cantidad'}
                  </p>
                  <input type="number" value={value} onChange={e => setValue(e.target.value)}
                    min="1" max={condition === 'nutrition_healthy' ? '100' : undefined}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#DC143C]/50 transition-all" />
                  <p className="text-xs text-gray-700">{CONDITION_HINT[condition]}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Apuesta en juego</p>
                <div className="flex gap-2">
                  <select value={currency} onChange={e => setCurrency(e.target.value)}
                    className="bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                    {['USD','MXN','EUR','COP','ARS'].map(c => <option key={c}>{c}</option>)}
                  </select>
                  <input type="number" value={stake} onChange={e => setStake(e.target.value)}
                    placeholder="20" min="1"
                    className="flex-1 bg-black border border-yellow-500/20 rounded-xl px-4 py-2.5 text-yellow-400 font-bold text-sm focus:outline-none focus:border-yellow-500/50 transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Fin del combate</p>
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#DC143C]/50 transition-all" />
              </div>

              {stakeNum > 0 && (
                <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>🏆 Si cumples, te llevas todo el bote</span>
                    <span className="text-yellow-400 font-bold">+ apuesta de retadores</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>⚡ XP ganado si vences</span>
                    <span className="text-yellow-400 font-bold">{xp} XP base</span>
                  </div>
                </div>
              )}

              <motion.button whileHover={ready ? { scale: 1.02 } : {}} whileTap={ready ? { scale: 0.98 } : {}}
                onClick={handleCreate} disabled={!ready}
                className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${
                  ready ? 'bg-[#DC143C] text-white' : 'bg-white/5 text-gray-600 cursor-not-allowed'
                }`}
                style={ready ? { boxShadow: '0 0 24px rgba(220,20,60,0.4)' } : {}}>
                ⚔ Lanzar al Coliseo
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ─── History Card (apuesta completada) ──────────────────────────── */
function HistoryCard({ bet, userId }: { bet: Bet; userId: string }) {
  const isCreator    = bet.creator?.id === userId
  const myAcceptance = bet.acceptances.find(a => a.userId === userId)

  type OutcomeInfo = { emoji: string; label: string; color: string; detail: string }
  let outcome: OutcomeInfo

  if (bet.status === 'tied') {
    const amt = isCreator ? bet.stake : (myAcceptance?.amount ?? 0)
    outcome = {
      emoji: '⚖', label: 'Empate', color: 'text-blue-400',
      detail: `Apuesta devuelta · ${fmt(amt, bet.currency)}`,
    }
  } else if (bet.status === 'won') {
    if (isCreator) {
      const losersPool = bet.acceptances.filter(a => a.status === 'lost').reduce((s, a) => s + a.amount, 0)
      outcome = {
        emoji: '👑', label: '¡Victoria!', color: 'text-yellow-400',
        detail: `Ganaste ${fmt(bet.stake + losersPool, bet.currency)}`,
      }
    } else if (myAcceptance?.status === 'refunded') {
      outcome = {
        emoji: '↩', label: 'Devuelto', color: 'text-blue-400',
        detail: `Recuperaste ${fmt(myAcceptance.amount, bet.currency)} (tú también cumpliste)`,
      }
    } else {
      outcome = {
        emoji: '💀', label: 'Derrota', color: 'text-red-500',
        detail: `Perdiste ${fmt(myAcceptance?.amount ?? 0, bet.currency)}`,
      }
    }
  } else if (bet.status === 'lost') {
    if (isCreator) {
      outcome = {
        emoji: '💀', label: 'Derrota', color: 'text-red-500',
        detail: `Perdiste ${fmt(bet.stake, bet.currency)}`,
      }
    } else if (myAcceptance?.status === 'won') {
      outcome = {
        emoji: '👑', label: '¡Victoria!', color: 'text-yellow-400',
        detail: `Ganaste tu apuesta + parte del bote`,
      }
    } else {
      outcome = {
        emoji: '💀', label: 'Derrota', color: 'text-red-500',
        detail: `Perdiste ${fmt(myAcceptance?.amount ?? 0, bet.currency)}`,
      }
    }
  } else if (bet.status === 'cancelled') {
    const amt = isCreator ? bet.stake : (myAcceptance?.amount ?? 0)
    outcome = {
      emoji: '🚫', label: 'Cancelada', color: 'text-gray-500',
      detail: `Devuelto · ${fmt(amt, bet.currency)}`,
    }
  } else {
    outcome = { emoji: '⚔', label: bet.status, color: 'text-gray-500', detail: '' }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border border-[#1A1A1A] rounded-xl bg-[#0D0D0D] hover:border-white/10 transition-colors">
      <div className="text-xl w-8 text-center flex-shrink-0">{outcome.emoji}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-semibold truncate">{bet.title}</p>
        <p className="text-xs text-gray-600 mt-0.5 truncate">
          {bet.conditionValue} {CONDITION_LABELS[bet.conditionType]}
          {' · '}⚔ {bet.creator.username}
          {bet.settledAt && ` · ${shortDate(bet.settledAt)}`}
        </p>
        <p className={`text-xs font-bold mt-1 ${outcome.color}`}>{outcome.label} — {outcome.detail}</p>
      </div>
      <div className="flex-shrink-0">
        <span className={`text-xs font-black px-2 py-1 rounded-lg border ${
          outcome.color === 'text-yellow-400' ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' :
          outcome.color === 'text-red-500'    ? 'border-red-900/30 bg-red-900/10 text-red-500' :
          outcome.color === 'text-blue-400'   ? 'border-blue-500/20 bg-blue-500/10 text-blue-400' :
          'border-white/10 bg-white/5 text-gray-500'
        }`}>
          {bet.xpReward > 0 ? `+${bet.xpReward} XP` : '—'}
        </span>
      </div>
    </div>
  )
}

/* ─── Challenge Card (apuesta activa) ────────────────────────────── */
function ChallengeCard({ bet, userId, onAccept, onSettle }: {
  bet: Bet; userId: string
  onAccept: (bet: Bet) => void; onSettle: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isCreator     = (bet.creator?.id ?? '') === userId
  const hasAccepted   = bet.acceptances.some(a => a.userId === userId)
  const isParticipant = isCreator || hasAccepted
  const totalPot      = bet.stake + bet.acceptances.reduce((s, a) => s + a.amount, 0)
  const isExpired     = new Date(bet.deadline) < new Date()

  const { data: progressData } = useQuery({
    queryKey: ['bet-progress', bet.id],
    queryFn: async () => (await betsApi.progress(bet.id)).data,
    enabled: expanded && ['open', 'active'].includes(bet.status),
    staleTime: 30000,
  })

  const borderColor = {
    open:   'border-[#1A1A1A] hover:border-white/10',
    active: 'border-yellow-500/20',
  }[bet.status] ?? 'border-[#1A1A1A]'

  const statusIcon = { open: '⚔️', active: '🔥' }[bet.status] ?? '⚔️'
  const statusBg   = { open: 'bg-[#DC143C]/10', active: 'bg-yellow-500/10' }[bet.status] ?? 'bg-white/5'

  return (
    <div className={`bg-[#0D0D0D] border ${borderColor} rounded-2xl overflow-hidden transition-colors`}>
      <div className="px-5 py-4 flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${statusBg}`}>
          {statusIcon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">{bet.title}</p>
          <p className="text-gray-600 text-xs mt-0.5">
            {bet.conditionValue} {CONDITION_LABELS[bet.conditionType]} · <span className="text-gray-500">⚔ {bet.creator.username}</span>
          </p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-yellow-400 text-xs font-black">🪙 {fmt(bet.stake, bet.currency)}</span>
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <Users className="w-3 h-3" />{bet.acceptances.length} retadores
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <Zap className="w-3 h-3 text-yellow-500" />{bet.xpReward + bet.acceptances.length * 25} XP
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <Clock className="w-3 h-3" />{timeLeft(bet.deadline)}
            </span>
          </div>
        </div>

        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-gray-700 mt-1">
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-5 pb-4 space-y-3 border-t border-white/5 pt-3">

              {/* Bote */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-2.5">
                  <div className="text-xs text-gray-600">Bote total</div>
                  <div className="text-sm font-black text-yellow-400">🪙 {fmt(totalPot, bet.currency)}</div>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5">
                  <div className="text-xs text-gray-600">Retadores</div>
                  <div className="text-sm font-black text-white">{bet.acceptances.length}</div>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5">
                  <div className="text-xs text-gray-600">XP victoria</div>
                  <div className="text-sm font-black text-yellow-400">⚡{bet.xpReward + bet.acceptances.length * 25}</div>
                </div>
              </div>

              {/* Progreso en tiempo real */}
              {progressData?.progress && (
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-700 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <Eye className="w-3 h-3" /> Progreso actual
                  </p>
                  <div className="space-y-2">
                    {/* Creator */}
                    <div className="bg-white/[0.03] rounded-xl px-3 py-2.5">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-gray-400 font-semibold">⚔ {bet.creator.username} <span className="text-gray-700 font-normal">(creador)</span></span>
                        <span className={progressData.progress.creator?.done ? 'text-green-400 font-bold' : 'text-gray-500'}>
                          {progressData.progress.creator?.current ?? 0} / {progressData.progress.creator?.target ?? bet.conditionValue}
                          {progressData.progress.creator?.done && ' ✅'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${progressData.progress.creator?.done ? 'bg-green-400' : 'bg-[#DC143C]'}`}
                          style={{
                            width: `${Math.min(100, ((progressData.progress.creator?.current ?? 0) / (progressData.progress.creator?.target ?? bet.conditionValue)) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                    {/* Acceptors */}
                    {progressData.progress.acceptors?.map((a: any) => (
                      <div key={a.userId} className="bg-white/[0.03] rounded-xl px-3 py-2.5">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-gray-400 font-semibold">⚔ {a.username}</span>
                          <span className={a.done ? 'text-green-400 font-bold' : 'text-gray-500'}>
                            {a.current ?? 0} / {a.target ?? bet.conditionValue}
                            {a.done && ' ✅'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${a.done ? 'bg-green-400' : 'bg-yellow-400'}`}
                            style={{ width: `${Math.min(100, ((a.current ?? 0) / (a.target ?? bet.conditionValue)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {progressData.progress.expired && (
                      <p className="text-xs text-[#DC143C] font-bold text-center">⏰ Tiempo agotado — cierra el combate</p>
                    )}
                  </div>
                </div>
              )}

              {/* Retadores lista */}
              {bet.acceptances.length > 0 && !progressData?.progress && (
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-700 uppercase tracking-wider font-semibold">⚔ Gladiadores retadores</p>
                  {bet.acceptances.map(a => (
                    <div key={a.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">⚔ {a.user.username}</span>
                      <span className="font-bold text-gray-500">🪙 {fmt(a.amount, bet.currency)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-2">
                {!isCreator && !hasAccepted && bet.status === 'open' && (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => onAccept(bet)}
                    className="flex-1 py-2.5 rounded-xl bg-yellow-500/15 border border-yellow-500/25 text-yellow-400 text-xs font-black uppercase tracking-wide transition-all">
                    ⚔ Entrar al combate
                  </motion.button>
                )}
                {isParticipant && ['open', 'active'].includes(bet.status) && isExpired && (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={onSettle}
                    className="flex-1 py-2.5 rounded-xl bg-[#DC143C]/20 border border-[#DC143C]/30 text-[#DC143C] text-xs font-black uppercase tracking-wide transition-all">
                    ⚔ Cerrar combate
                  </motion.button>
                )}
                {!hasAccepted && !isCreator && bet.status === 'active' && !isExpired && (
                  <div className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-600 text-xs font-black text-center">
                    Combate en curso
                  </div>
                )}
                {hasAccepted && !isCreator && bet.status === 'active' && !isExpired && (
                  <div className="flex-1 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-black text-center">
                    🔥 En el coliseo
                  </div>
                )}
                {isCreator && bet.status === 'open' && bet.acceptances.length === 0 && (
                  <motion.button whileTap={{ scale: 0.97 }}
                    onClick={async () => {
                      if (confirm('¿Cancelar apuesta y recuperar tu oro?')) {
                        // handled by parent via separate cancel mutation if needed
                      }
                    }}
                    className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-gray-600 text-xs font-black transition-all">
                    Cancelar
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────── */
export default function ColiseumPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [acceptBet,  setAcceptBet]  = useState<Bet | null>(null)
  const [tab, setTab]               = useState<'all' | 'mine'>('all')
  const qc       = useQueryClient()
  const { user } = useAuthStore()

  const { data: allData, isLoading } = useQuery({
    queryKey: ['bets-all'],
    queryFn: async () => (await betsApi.list()).data.bets as Bet[],
    refetchInterval: 30_000,
  })

  const { data: myData } = useQuery({
    queryKey: ['bets-my'],
    queryFn: async () => (await betsApi.my()).data,
    refetchInterval: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: (d: object) => betsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bets-all'] })
      qc.invalidateQueries({ queryKey: ['bets-my'] })
      toast.success('⚔ ¡Desafío lanzado al coliseo!')
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error al lanzar el desafío'),
  })

  const acceptMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => betsApi.accept(id, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bets-all'] })
      qc.invalidateQueries({ queryKey: ['bets-my'] })
      toast.success('⚔ ¡Has entrado al coliseo!')
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error'),
  })

  const settleMutation = useMutation({
    mutationFn: (id: string) => betsApi.settle(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['bets-all'] })
      qc.invalidateQueries({ queryKey: ['bets-my'] })
      qc.invalidateQueries({ queryKey: ['rpg-character'] })
      const d = res.data
      if (d.outcome === 'creator_wins')       toast.success(`👑 ¡El creador venció! +${d.xpAwarded} XP`)
      else if (d.outcome === 'acceptors_win') toast.success(`👑 ¡Los retadores vencieron!`)
      else if (d.outcome === 'tie')           toast(`⚖ ¡Empate! Apuestas devueltas.`, { icon: '⚖' })
      else if (d.outcome === 'none_completed') toast(`💀 Nadie cumplió el reto. Apuestas devueltas.`, { icon: '💀' })
      else                                    toast.success('Combate cerrado')
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error'),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => betsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bets-all'] })
      qc.invalidateQueries({ queryKey: ['bets-my'] })
      toast.success('Apuesta cancelada. Apuesta devuelta.')
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error'),
  })

  const allBets    = allData ?? []
  const myCreated  = (myData?.created ?? []) as Bet[]
  const myAccepted = (myData?.accepted ?? []).map((a: any) => a.bet as Bet)
  const myBets     = [...myCreated, ...myAccepted].filter((b, i, arr) => arr.findIndex((x: Bet) => x.id === b.id) === i)

  // Separar activos e histórico
  const SETTLED = ['won', 'lost', 'tied', 'cancelled']
  const activeBets    = myBets.filter(b => !SETTLED.includes(b.status))
  const completedBets = myBets.filter(b => SETTLED.includes(b.status))
    .sort((a, b) => new Date(b.settledAt ?? b.createdAt).getTime() - new Date(a.settledAt ?? a.createdAt).getTime())

  const wonBets  = myCreated.filter(b => b.status === 'won').length
  const lostBets = myCreated.filter(b => b.status === 'lost').length

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 uppercase tracking-wide">
            <Sword className="w-7 h-7 text-[#DC143C]" />
            Coliseo
          </h1>
          <p className="text-gray-600 mt-1 text-sm">Pon tu disciplina a prueba — en público</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#DC143C] text-white rounded-xl font-black text-sm uppercase tracking-wide flex-shrink-0"
          style={{ boxShadow: '0 0 20px rgba(220,20,60,0.4)' }}>
          <Sword className="w-4 h-4" /> Desafiar
        </motion.button>
      </div>

      {/* Stats del gladiador */}
      {(wonBets > 0 || lostBets > 0 || completedBets.length > 0) && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0D0D0D] border border-yellow-500/20 rounded-2xl p-4 text-center"
            style={{ boxShadow: '0 0 20px rgba(234,179,8,0.05)' }}>
            <div className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-1">Victorias</div>
            <div className="text-2xl font-black text-yellow-400">👑 {wonBets}</div>
          </div>
          <div className="bg-[#0D0D0D] border border-red-900/30 rounded-2xl p-4 text-center">
            <div className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-1">Derrotas</div>
            <div className="text-2xl font-black text-red-600">💀 {lostBets}</div>
          </div>
          <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-4 text-center">
            <div className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-1">Ratio</div>
            <div className="text-2xl font-black text-white">
              {wonBets + lostBets > 0 ? Math.round((wonBets / (wonBets + lostBets)) * 100) : 0}%
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(['all', 'mine'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all ${
              tab === t
                ? 'bg-[#DC143C]/20 border border-[#DC143C]/40 text-white'
                : 'bg-white/5 border border-white/8 text-gray-600 hover:text-gray-400'
            }`}>
            {t === 'all' ? '⚔ Arena' : `🛡 Mis combates${activeBets.length > 0 ? ` (${activeBets.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* ─── Arena: apuestas abiertas/activas ─── */}
      {tab === 'all' && (
        isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-white/5" />)}
          </div>
        ) : allBets.length === 0 ? (
          <div className="text-center py-16 text-gray-700">
            <div className="text-5xl mb-3">⚔️</div>
            <p className="text-sm font-bold text-gray-600">El coliseo está vacío</p>
            <p className="text-xs mt-1">Lanza el primer desafío y demuestra tu disciplina</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allBets.map(bet => (
              <ChallengeCard
                key={bet.id}
                bet={bet}
                userId={user?.id ?? ''}
                onAccept={b => setAcceptBet(b)}
                onSettle={() => settleMutation.mutate(bet.id)}
              />
            ))}
          </div>
        )
      )}

      {/* ─── Mis combates: activos + historial ─── */}
      {tab === 'mine' && (
        <div className="space-y-6">
          {/* Activos */}
          {activeBets.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">En curso</p>
              {activeBets.map(bet => (
                <ChallengeCard
                  key={bet.id}
                  bet={bet}
                  userId={user?.id ?? ''}
                  onAccept={b => setAcceptBet(b)}
                  onSettle={() => settleMutation.mutate(bet.id)}
                />
              ))}
            </div>
          )}

          {/* Historial */}
          {completedBets.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <History className="w-3.5 h-3.5" />
                Historial de combates ({completedBets.length})
              </p>
              {completedBets.map(bet => (
                <HistoryCard key={bet.id} bet={bet} userId={user?.id ?? ''} />
              ))}
            </div>
          )}

          {activeBets.length === 0 && completedBets.length === 0 && (
            <div className="text-center py-16 text-gray-700">
              <div className="text-4xl mb-3">🛡</div>
              <p className="text-sm font-bold text-gray-600">Aún no has participado</p>
              <p className="text-xs mt-1">Lanza o acepta un desafío para empezar</p>
            </div>
          )}
        </div>
      )}

      <CreateChallengeModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={d => createMutation.mutate(d)} />
      <AcceptModal open={!!acceptBet} bet={acceptBet} onClose={() => setAcceptBet(null)}
        onAccept={(id, amount) => acceptMutation.mutate({ id, amount })} />
    </div>
  )
}
