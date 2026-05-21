'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { reportApi } from '@/lib/api'
import {
  Dumbbell, Activity, Apple, CheckSquare, Target,
  BookOpen, Moon, TrendingUp, Sword, Trophy,
  Zap, Flame, Star, Clock, BarChart2,
} from 'lucide-react'

interface ReportData {
  profile: { xp: number; level: number; rank: string; class: string | null; streak: number; longestStreak: number; daysSinceJoined: number }
  gym: { totalSessions: number; totalVolume: number; totalMinutes: number }
  cardio: { totalSessions: number; totalMinutes: number; totalKm: number; totalCaloriesBurned: number }
  nutrition: { totalMeals: number; avgCaloriesPerMeal: number }
  habits: { totalHabits: number; totalCompletions: number }
  goals: { total: number; completed: number }
  learning: { totalSessions: number; totalMinutes: number; totalXP: number }
  sleep: { totalLogs: number; avgHours: number; avgEnergy: number; avgMood: number }
  savings: { totalGoals: number; totalSaved: number; totalTarget: number }
  bets: { won: number; lost: number }
}

function fmtHours(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}min`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</span>
      <span className="text-2xl font-bold text-white font-heading">{value}</span>
      {sub && <span className="text-xs text-gray-500">{sub}</span>}
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: React.ElementType
  title: string
  color: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{title}</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{children}</div>
    </motion.div>
  )
}

const RANK_COLORS: Record<string, string> = {
  Bronze: 'text-amber-700',
  Silver: 'text-gray-400',
  Gold: 'text-yellow-400',
  Platinum: 'text-cyan-300',
  Diamond: 'text-blue-300',
}

export default function ReportPage() {
  const { data, isLoading, isError } = useQuery<ReportData>({
    queryKey: ['report-summary'],
    queryFn: () => reportApi.summary().then(r => r.data),
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Cargando informe...
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Error al cargar el informe.
      </div>
    )
  }

  const { profile, gym, cardio, nutrition, habits, goals, learning, sleep, savings, bets } = data

  const savingsPct = savings.totalTarget > 0
    ? Math.round((savings.totalSaved / savings.totalTarget) * 100)
    : 0

  const goalsPct = goals.total > 0
    ? Math.round((goals.completed / goals.total) * 100)
    : 0

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-elite-600 flex items-center justify-center shadow-glow-red">
          <BarChart2 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-heading">Informe Total</h1>
          <p className="text-xs text-gray-500">{profile.daysSinceJoined} días en ELITE OS</p>
        </div>
      </div>

      {/* Profile hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-elite-600/20 to-[#111] border border-elite-600/30 rounded-2xl p-5"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Rango</span>
            <span className={`text-2xl font-bold font-heading ${RANK_COLORS[profile.rank] ?? 'text-white'}`}>
              {profile.rank}
            </span>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Nivel</span>
            <span className="text-2xl font-bold text-white font-heading">{profile.level}</span>
          </div>
          {profile.class && (
            <>
              <div className="w-px h-10 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Clase</span>
                <span className="text-2xl font-bold text-white font-heading capitalize">{profile.class}</span>
              </div>
            </>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/[0.05] rounded-xl p-3 text-center">
            <Zap size={14} className="text-yellow-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">{profile.xp.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500">XP total</div>
          </div>
          <div className="bg-white/[0.05] rounded-xl p-3 text-center">
            <Flame size={14} className="text-orange-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">{profile.streak}</div>
            <div className="text-[10px] text-gray-500">Racha actual</div>
          </div>
          <div className="bg-white/[0.05] rounded-xl p-3 text-center">
            <Star size={14} className="text-purple-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">{profile.longestStreak}</div>
            <div className="text-[10px] text-gray-500">Mejor racha</div>
          </div>
        </div>
      </motion.div>

      {/* Gym */}
      <Section icon={Dumbbell} title="Forja" color="bg-red-600">
        <StatCard label="Sesiones" value={gym.totalSessions} />
        <StatCard label="Volumen total" value={`${(gym.totalVolume / 1000).toFixed(1)}t`} sub="toneladas levantadas" />
        <StatCard label="Tiempo" value={fmtHours(gym.totalMinutes)} />
      </Section>

      {/* Cardio */}
      <Section icon={Activity} title="Campo" color="bg-green-600">
        <StatCard label="Sesiones" value={cardio.totalSessions} />
        <StatCard label="Distancia" value={`${cardio.totalKm} km`} />
        <StatCard label="Calorías" value={cardio.totalCaloriesBurned.toLocaleString()} sub="quemadas" />
        <StatCard label="Tiempo" value={fmtHours(cardio.totalMinutes)} />
      </Section>

      {/* Nutrition */}
      <Section icon={Apple} title="Taberna" color="bg-orange-600">
        <StatCard label="Comidas" value={nutrition.totalMeals} sub="registradas" />
        <StatCard label="Prom. calorías" value={nutrition.avgCaloriesPerMeal} sub="por comida" />
      </Section>

      {/* Habits */}
      <Section icon={CheckSquare} title="Juramentos" color="bg-blue-600">
        <StatCard label="Hábitos activos" value={habits.totalHabits} />
        <StatCard label="Completados" value={habits.totalCompletions} sub="veces en total" />
      </Section>

      {/* Goals */}
      <Section icon={Target} title="Misiones" color="bg-purple-600">
        <StatCard label="Total metas" value={goals.total} />
        <StatCard label="Completadas" value={goals.completed} />
        <StatCard label="Tasa éxito" value={`${goalsPct}%`} />
      </Section>

      {/* Learning */}
      <Section icon={BookOpen} title="Grimorio" color="bg-cyan-600">
        <StatCard label="Sesiones" value={learning.totalSessions} />
        <StatCard label="Tiempo" value={fmtHours(learning.totalMinutes)} />
        <StatCard label="XP ganado" value={learning.totalXP.toLocaleString()} />
      </Section>

      {/* Sleep */}
      <Section icon={Moon} title="Santuario" color="bg-indigo-600">
        <StatCard label="Registros" value={sleep.totalLogs} sub="días" />
        <StatCard label="Prom. horas" value={sleep.avgHours} />
        <StatCard label="Energía media" value={`${sleep.avgEnergy}/10`} />
        <StatCard label="Ánimo medio" value={`${sleep.avgMood}/10`} />
      </Section>

      {/* Savings */}
      <Section icon={TrendingUp} title="Tesorería" color="bg-yellow-600">
        <StatCard label="Metas" value={savings.totalGoals} />
        <StatCard label="Ahorrado" value={`$${savings.totalSaved.toLocaleString()}`} />
        <StatCard label="Meta total" value={`$${savings.totalTarget.toLocaleString()}`} />
        <StatCard label="Progreso" value={`${savingsPct}%`} />
      </Section>

      {/* Bets */}
      <Section icon={Sword} title="Apuestas" color="bg-pink-600">
        <StatCard label="Ganadas" value={bets.won} />
        <StatCard label="Perdidas" value={bets.lost} />
        <StatCard
          label="Ratio"
          value={bets.won + bets.lost > 0 ? `${Math.round((bets.won / (bets.won + bets.lost)) * 100)}%` : '—'}
          sub="victorias"
        />
      </Section>

      {/* Footer */}
      <div className="text-center text-xs text-gray-600 pt-2 flex items-center justify-center gap-1">
        <Clock size={11} />
        Datos acumulados desde el primer día
      </div>
    </div>
  )
}
