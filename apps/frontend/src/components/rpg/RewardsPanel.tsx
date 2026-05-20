'use client'

import { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Lock, Gift, Check } from 'lucide-react'
import { rpgApi, rewardsApi } from '@/lib/api'
import type { RPGCharacter } from '@/types'
import toast from 'react-hot-toast'

/* ─── Types ──────────────────────────────────────────────────────── */
interface EarnedReward {
  id: string
  achievementId: string
  rewardLabel: string
  rewardEmoji: string
  rewardDesc: string
  earnedAt: string
  redeemedAt: string | null
}

interface Achievement {
  id: string
  icon: string
  name: string
  description: string
  unlocked: boolean
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  reward?: { label: string; emoji: string }
}

/* ─── Achievement definitions ────────────────────────────────────── */
const RARITY_STYLES = {
  common:    { border: 'border-gray-700',      glow: '',                                           badge: 'text-gray-400',   bg: 'bg-gray-800/40' },
  rare:      { border: 'border-blue-700/60',   glow: 'shadow-[0_0_12px_rgba(59,130,246,0.25)]',   badge: 'text-blue-400',   bg: 'bg-blue-900/20' },
  epic:      { border: 'border-purple-600/60', glow: 'shadow-[0_0_14px_rgba(147,51,234,0.3)]',    badge: 'text-purple-400', bg: 'bg-purple-900/20' },
  legendary: { border: 'border-yellow-500/60', glow: 'shadow-[0_0_18px_rgba(234,179,8,0.35)]',    badge: 'text-yellow-400', bg: 'bg-yellow-900/20' },
}

function buildAchievements(c: RPGCharacter | undefined): Achievement[] {
  if (!c) return []
  const level = c.level ?? 0
  const streak = c.streak ?? 0
  return [
    {
      id: 'primer_paso',
      icon: '🌟', name: 'Primer Paso',
      description: 'Alcanza el nivel 2',
      unlocked: level >= 2, rarity: 'common',
    },
    {
      id: 'constante',
      icon: '🔥', name: 'El Constante',
      description: 'Racha de 7 días',
      unlocked: streak >= 7, rarity: 'common',
      reward: { label: 'Comida Trampa', emoji: '🍔' },
    },
    {
      id: 'veterano',
      icon: '⭐', name: 'Veterano',
      description: 'Nivel 10',
      unlocked: level >= 10, rarity: 'rare',
      reward: { label: 'Tarde de Ocio', emoji: '🌙' },
    },
    {
      id: 'incansable',
      icon: '⚡', name: 'El Incansable',
      description: 'Racha de 30 días',
      unlocked: streak >= 30, rarity: 'rare',
      reward: { label: 'Día Libre', emoji: '🏖️' },
    },
    {
      id: 'titan',
      icon: '💪', name: 'Titán de Hierro',
      description: 'STR ≥ 50',
      unlocked: (c.statStr ?? 0) >= 50, rarity: 'rare',
      reward: { label: 'Día de Descanso', emoji: '💪' },
    },
    {
      id: 'mente',
      icon: '🧠', name: 'Mente Brillante',
      description: 'INT ≥ 50',
      unlocked: (c.statInt ?? 0) >= 50, rarity: 'rare',
      reward: { label: 'Noche de Entretenimiento', emoji: '📺' },
    },
    {
      id: 'cuerpo_acero',
      icon: '🛡️', name: 'Cuerpo de Acero',
      description: 'VIT ≥ 50',
      unlocked: (c.statVit ?? 0) >= 50, rarity: 'rare',
    },
    {
      id: 'voluntad',
      icon: '🎯', name: 'Voluntad de Hierro',
      description: 'DIS ≥ 50',
      unlocked: (c.statDis ?? 0) >= 50, rarity: 'rare',
    },
    {
      id: 'oraculo',
      icon: '🔮', name: 'Oráculo',
      description: 'WIS ≥ 50',
      unlocked: (c.statWis ?? 0) >= 50, rarity: 'epic',
    },
    {
      id: 'magnate',
      icon: '💰', name: 'Magnate',
      description: 'GOL ≥ 50',
      unlocked: (c.statGol ?? 0) >= 50, rarity: 'epic',
    },
    {
      id: 'resurrecto',
      icon: '💀', name: 'El Resurrecto',
      description: 'Sobrevive tu primera muerte',
      unlocked: (c.deathCount ?? 0) >= 1, rarity: 'epic',
    },
    {
      id: 'combo_iniciado',
      icon: '🔗', name: 'Combo Iniciado',
      description: 'Combo 3 días seguidos',
      unlocked: (c.comboStreak ?? 0) >= 3, rarity: 'epic',
      reward: { label: 'Snack Libre', emoji: '🍕' },
    },
    {
      id: 'combo_master',
      icon: '🌊', name: 'Combo Master',
      description: 'Combo 10 días seguidos',
      unlocked: (c.comboStreak ?? 0) >= 10, rarity: 'legendary',
      reward: { label: 'Fin de Semana Libre', emoji: '🎉' },
    },
    {
      id: 'maestro',
      icon: '🏆', name: 'Maestro',
      description: 'Nivel 20',
      unlocked: level >= 20, rarity: 'legendary',
      reward: { label: 'Vacaciones (3 días)', emoji: '✈️' },
    },
    {
      id: 'leyenda',
      icon: '👑', name: 'Leyenda',
      description: 'Diamond + racha de 30 días',
      unlocked: c.rank === 'Diamond' && streak >= 30, rarity: 'legendary',
      reward: { label: 'Semana Sin Reglas', emoji: '👑' },
    },
  ]
}

/* ─── Redeem Confirm Modal ───────────────────────────────────────── */
function RedeemModal({ reward, onConfirm, onClose }: {
  reward: EarnedReward
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-[#0D0D0D] border border-yellow-500/30 rounded-2xl w-full max-w-xs p-6 text-center space-y-4 pointer-events-auto"
          style={{ boxShadow: '0 0 40px rgba(234,179,8,0.15)' }}
          onClick={e => e.stopPropagation()}>
          <div className="text-5xl">{reward.rewardEmoji}</div>
          <div>
            <h2 className="text-lg font-black text-yellow-400 uppercase tracking-wide">{reward.rewardLabel}</h2>
            <p className="text-sm text-gray-400 mt-1">{reward.rewardDesc}</p>
          </div>
          <p className="text-xs text-gray-600">Al canjear confirmas que usarás esta recompensa. No podrás recuperarla.</p>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-500 text-sm font-bold hover:text-white transition-colors">
              Cancelar
            </button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl bg-yellow-500 text-black text-sm font-black uppercase"
              style={{ boxShadow: '0 0 20px rgba(234,179,8,0.4)' }}>
              🎁 Canjear
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  )
}

/* ─── Pending Reward Card ────────────────────────────────────────── */
function PendingRewardCard({ reward, onRedeem }: { reward: EarnedReward; onRedeem: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      className="relative rounded-2xl border border-yellow-500/40 bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 p-4 flex items-center gap-4"
      style={{ boxShadow: '0 0 20px rgba(234,179,8,0.12)' }}
    >
      {/* Pulse dot */}
      <span className="absolute top-3 right-3 flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
      </span>

      <div className="w-14 h-14 rounded-xl bg-yellow-500/15 border border-yellow-500/20 flex items-center justify-center text-3xl flex-shrink-0">
        {reward.rewardEmoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-black text-sm">{reward.rewardLabel}</p>
        <p className="text-gray-500 text-xs mt-0.5 leading-tight">{reward.rewardDesc}</p>
        <p className="text-yellow-600 text-[10px] mt-1 uppercase tracking-wider font-semibold">
          Ganado · {new Date(reward.earnedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
        </p>
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={onRedeem}
        className="flex-shrink-0 px-3 py-2 rounded-xl bg-yellow-500 text-black text-xs font-black uppercase tracking-wide"
        style={{ boxShadow: '0 0 12px rgba(234,179,8,0.35)' }}>
        Canjear
      </motion.button>
    </motion.div>
  )
}

/* ─── Achievement Card ───────────────────────────────────────────── */
function AchievementCard({ a, delay }: { a: Achievement; delay: number }) {
  const s = RARITY_STYLES[a.rarity]
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className={`relative rounded-xl border p-3 flex flex-col items-center gap-1.5 transition-all
        ${a.unlocked ? `${s.border} ${s.glow} ${s.bg}` : 'border-[#1E1E1E] bg-[#0D0D0D] opacity-50 grayscale'}`}
    >
      {a.unlocked ? (
        <span className={`absolute top-2 right-2 text-[9px] font-bold uppercase tracking-widest ${s.badge}`}>
          {a.rarity === 'legendary' ? '★' : a.rarity === 'epic' ? '◆' : a.rarity === 'rare' ? '●' : '·'}
        </span>
      ) : (
        <span className="absolute top-2 right-2 text-gray-700"><Lock size={10} /></span>
      )}

      <span className="text-2xl leading-none">{a.icon}</span>
      <p className={`text-[11px] font-bold text-center leading-tight ${a.unlocked ? 'text-white' : 'text-gray-600'}`}>
        {a.name}
      </p>
      <p className="text-[9px] text-gray-600 text-center leading-tight">{a.description}</p>

      {/* Reward tag */}
      {a.reward && (
        <div className={`mt-1 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${
          a.unlocked
            ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
            : 'border-gray-700/50 bg-gray-800/20 text-gray-600'
        }`}>
          <span>{a.reward.emoji}</span>
          <span>{a.reward.label}</span>
        </div>
      )}
    </motion.div>
  )
}

/* ─── Panel ──────────────────────────────────────────────────────── */
export default function RewardsPanel() {
  const qc = useQueryClient()
  const [redeemTarget, setRedeemTarget] = useState<EarnedReward | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const { data: character } = useQuery<RPGCharacter>({
    queryKey: ['rpg-character'],
    queryFn: () => rpgApi.character().then(r => r.data.character as RPGCharacter),
    staleTime: 60_000,
    retry: false,
  })

  const { data: rewardsData, refetch } = useQuery({
    queryKey: ['earned-rewards'],
    queryFn: async () => {
      const res = await rewardsApi.list()
      return res.data as { pending: EarnedReward[]; redeemed: EarnedReward[] }
    },
    staleTime: 30_000,
  })

  // Sync on mount (checks if new rewards were earned)
  const syncMutation = useMutation({
    mutationFn: () => rewardsApi.sync(),
    onSuccess: (res) => {
      const count = res.data.count
      if (count > 0) {
        toast.success(`🎁 ¡${count} recompensa${count > 1 ? 's' : ''} nueva${count > 1 ? 's' : ''}!`)
        refetch()
      }
    },
  })

  useEffect(() => {
    syncMutation.mutate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const redeemMutation = useMutation({
    mutationFn: (id: string) => rewardsApi.redeem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['earned-rewards'] })
      setRedeemTarget(null)
      toast.success('¡Recompensa canjeada! Disfrútala 🎉')
    },
    onError: () => toast.error('Error al canjear'),
  })

  const achievements = useMemo(() => buildAchievements(character), [character])
  const unlocked = achievements.filter(a => a.unlocked).length
  const total    = achievements.length
  const pct      = total > 0 ? Math.round((unlocked / total) * 100) : 0

  const pending  = rewardsData?.pending  ?? []
  const redeemed = rewardsData?.redeemed ?? []

  return (
    <>
      <AnimatePresence>
        {redeemTarget && (
          <RedeemModal
            reward={redeemTarget}
            onConfirm={() => redeemMutation.mutate(redeemTarget.id)}
            onClose={() => setRedeemTarget(null)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl bg-[#111111] border border-[#1E1E1E]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E1E]">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Logros & Botín</h3>
          </div>
          <div className="flex items-center gap-3">
            {pending.length > 0 && (
              <span className="flex items-center gap-1 text-xs font-black text-yellow-400">
                <Gift className="w-3 h-3" />
                {pending.length} pendiente{pending.length > 1 ? 's' : ''}
              </span>
            )}
            <span className="text-xs text-gray-500">{unlocked}/{total}</span>
            <span className="text-xs font-bold text-yellow-400">{pct}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-5 py-3 border-b border-[#1E1E1E]">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-yellow-600 to-yellow-400"
            />
          </div>
          <p className="text-[10px] text-gray-600 mt-1.5">
            {unlocked === total
              ? '🎉 ¡Todos desbloqueados! Eres una leyenda.'
              : `${total - unlocked} logros por conquistar`}
          </p>
        </div>

        {/* Pending rewards — the main attraction */}
        <AnimatePresence>
          {pending.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-5 py-4 border-b border-[#1E1E1E] space-y-3"
            >
              <p className="text-xs text-yellow-500 font-black uppercase tracking-widest flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" /> Botín disponible
              </p>
              {pending.map(r => (
                <PendingRewardCard key={r.id} reward={r} onRedeem={() => setRedeemTarget(r)} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rarity legend */}
        <div className="px-5 py-2 border-b border-[#1E1E1E] flex items-center gap-4">
          {(['common', 'rare', 'epic', 'legendary'] as const).map(r => (
            <span key={r} className={`text-[9px] font-bold uppercase tracking-widest ${RARITY_STYLES[r].badge}`}>
              {r === 'legendary' ? '★' : r === 'epic' ? '◆' : r === 'rare' ? '●' : '·'}
              {' '}{r === 'common' ? 'común' : r === 'rare' ? 'raro' : r === 'epic' ? 'épico' : 'legendario'}
            </span>
          ))}
        </div>

        {/* Achievements grid */}
        <div className="p-5 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {achievements.map((a, i) => (
            <AchievementCard key={a.id} a={a} delay={i * 0.03} />
          ))}
        </div>

        {/* Redeemed history (collapsed) */}
        {redeemed.length > 0 && (
          <div className="border-t border-[#1E1E1E]">
            <button
              onClick={() => setShowHistory(v => !v)}
              className="w-full px-5 py-3 flex items-center justify-between text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                {redeemed.length} recompensa{redeemed.length > 1 ? 's' : ''} canjeada{redeemed.length > 1 ? 's' : ''}
              </span>
              <span>{showHistory ? '▲' : '▼'}</span>
            </button>
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 space-y-2">
                    {redeemed.map(r => (
                      <div key={r.id} className="flex items-center gap-3 py-2 border-b border-[#1A1A1A] last:border-0 opacity-50">
                        <span className="text-xl">{r.rewardEmoji}</span>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 font-bold">{r.rewardLabel}</p>
                          <p className="text-[10px] text-gray-700">
                            Canjeado · {new Date(r.redeemedAt!).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </>
  )
}
