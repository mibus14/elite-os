'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Flame,
  CheckCircle,
  Utensils,
  Droplets,
  Moon,
  TrendingUp,
  TrendingDown,
  Dumbbell,
  Activity,
  BookOpen,
  Apple,
} from 'lucide-react';
import { dashboardApi, rpgApi, dailyLogApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { DashboardStats, RPGCharacter } from '@/types';
import ActivityHeatmap from '@/components/dashboard/ActivityHeatmap';
import RadarChart from '@/components/dashboard/RadarChart';
import WeeklyXPChart from '@/components/dashboard/WeeklyXPChart';
import GoalProgressCard from '@/components/dashboard/GoalProgressCard';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import MacroDonut from '@/components/dashboard/MacroDonut';
import YouDiedScreen from '@/components/rpg/YouDiedScreen';
import ComboCard from '@/components/rpg/ComboCard';
import MissionsPanel from '@/components/rpg/MissionsPanel';
import RewardsPanel from '@/components/rpg/RewardsPanel';

/* ─── Stat Card ──────────────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  glowColor?: string;
  delay?: number;
}

function StatCard({ label, value, sub, icon, trend, trendValue, glowColor = '#DC143C', delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, boxShadow: `0 0 24px 2px ${glowColor}33` }}
      className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5 cursor-default transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{label}</span>
        <div className="p-2 rounded-xl bg-white/5">{icon}</div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.2 }}
        className="text-3xl font-bold text-white leading-none mb-1"
      >
        {value}
      </motion.div>

      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-gray-500">{sub}</span>
        {trendValue && (
          <span
            className={`text-xs font-semibold flex items-center gap-0.5 ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}
          >
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trendValue}
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Water Tracker (interactive) ───────────────────────────────────── */
function WaterTracker({ cups, goal }: { cups: number; goal: number }) {
  const qc = useQueryClient();
  const [localCups, setLocalCups] = useState(cups);

  useEffect(() => { setLocalCups(cups); }, [cups]);

  const saveMutation = useMutation({
    mutationFn: (n: number) => dailyLogApi.save({ waterGlasses: n }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-log'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const set = (n: number) => {
    const next = Math.max(0, Math.min(goal, n));
    setLocalCups(next);
    saveMutation.mutate(next);
  };

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Agua</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => set(localCups - 1)}
            disabled={localCups === 0 || saveMutation.isPending}
            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-white font-bold text-sm flex items-center justify-center hover:bg-white/10 disabled:opacity-30 transition-all"
          >−</button>
          <span className="text-xs text-blue-400 font-medium w-16 text-center">{localCups}/{goal} vasos</span>
          <button
            onClick={() => set(localCups + 1)}
            disabled={localCups === goal || saveMutation.isPending}
            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-white font-bold text-sm flex items-center justify-center hover:bg-white/10 disabled:opacity-30 transition-all"
          >+</button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: goal }).map((_, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.92 }}
            onClick={() => set(i < localCups ? i : i + 1)}
            className={`h-11 rounded-xl border-2 flex items-center justify-center transition-all ${
              i < localCups
                ? 'bg-blue-500/80 border-blue-400 text-white'
                : 'bg-transparent border-gray-700/50 text-gray-700 hover:border-gray-600'
            }`}
          >
            <Droplets className="w-4 h-4" />
          </motion.button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        {(localCups * 250) / 1000}L de {(goal * 250) / 1000}L
        {saveMutation.isPending && <span className="ml-2 text-blue-500/50">guardando…</span>}
      </p>
    </div>
  );
}

/* ─── Sleep Display (read-only — edita en Santuario) ────────────────── */
function SleepDisplay({ hours }: { hours: number }) {
  const quality = hours >= 8 ? 'Excelente' : hours >= 7 ? 'Bueno' : hours >= 6 ? 'Regular' : hours > 0 ? 'Malo' : ''
  const qualityColor = hours >= 8 ? 'text-green-400' : hours >= 7 ? 'text-blue-400' : hours >= 6 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Moon className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Sueño</h3>
      </div>
      {hours > 0 ? (
        <>
          <div className="text-3xl font-bold text-white mb-1">{hours}h</div>
          <div className={`text-sm font-semibold mb-3 ${qualityColor}`}>{quality}</div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((hours / 9) * 100, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-indigo-800 to-indigo-500"
            />
          </div>
        </>
      ) : (
        <p className="text-2xl font-bold text-gray-700 mb-3">— sin registro</p>
      )}
      <p className="text-xs text-indigo-500/50">Registra en Santuario</p>
    </div>
  );
}

/* ─── Dynamic Greeting ──────────────────────────────────────────────── */
function DynamicGreeting({ username, streak }: { username: string; streak: number }) {
  const [greeting, setGreeting] = useState('')
  const [streakMsg, setStreakMsg] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches')
    if (streak >= 365) setStreakMsg('Leyenda viviente. Un año de fuego.')
    else if (streak >= 100) setStreakMsg('100 días de pura élite. Imparable.')
    else if (streak >= 30) setStreakMsg(`${streak} días en racha. Eres una máquina.`)
    else if (streak >= 14) setStreakMsg(`${streak} días seguidos. Racha épica.`)
    else if (streak >= 7) setStreakMsg(`Semana completa. Sigue el camino.`)
    else if (streak >= 2) setStreakMsg(`${streak} días. El hábito se forja ahora.`)
    else setStreakMsg('Cada gran racha empieza con hoy.')
  }, [streak])

  return (
    <div>
      <h1 className="text-3xl font-black text-white uppercase tracking-wide">
        {greeting}, <span className="text-elite-600">{username}</span>
      </h1>
      <p className="text-gray-500 mt-1">{streakMsg}</p>
    </div>
  )
}

/* ─── Quick Actions ─────────────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { label: 'Forja',      icon: Dumbbell,  href: '/gym',       color: '#DC143C' },
  { label: 'Taberna',    icon: Apple,     href: '/nutrition', color: '#22C55E' },
  { label: 'Campo',      icon: Activity,  href: '/cardio',    color: '#3B82F6' },
  { label: 'Grimorio',   icon: BookOpen,  href: '/learning',  color: '#8B5CF6' },
]

function QuickActions() {
  const router = useRouter()
  return (
    <div className="flex gap-3 flex-wrap">
      {QUICK_ACTIONS.map(({ label, icon: Icon, href, color }) => (
        <motion.button
          key={href}
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push(href)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
          style={{ boxShadow: `0 0 0 0 ${color}` }}
        >
          <Icon size={15} style={{ color }} />
          {label}
        </motion.button>
      ))}
    </div>
  )
}

/* ─── Loading Skeleton ──────────────────────────────────────────────── */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 md:h-36 rounded-2xl bg-white/5" />
        ))}
      </div>
      <div className="h-48 rounded-2xl bg-white/5" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-80 rounded-2xl bg-white/5" />
        <div className="h-80 rounded-2xl bg-white/5" />
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user: authUser } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await dashboardApi.stats();
      return res.data as DashboardStats;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: character } = useQuery<RPGCharacter>({
    queryKey: ['rpg-character'],
    queryFn: () => rpgApi.character().then((r) => r.data.character as RPGCharacter),
    staleTime: 60_000,
    retry: false,
  });

  const username = authUser?.username ?? 'Guerrero'

  // Use real API data; only fall back for complex objects that cannot be empty
  const stats: DashboardStats = {
    todayXP:         data?.todayXP         ?? 0,
    yesterdayXP:     data?.yesterdayXP     ?? 0,
    currentStreak:   data?.currentStreak   ?? 0,
    habitsCompleted: data?.habitsCompleted ?? 0,
    habitsTotal:     data?.habitsTotal     ?? 0,
    caloriesConsumed:data?.caloriesConsumed ?? 0,
    caloriesGoal:    data?.caloriesGoal    ?? 0,
    activityHeatmap: data?.activityHeatmap ?? [],
    radarData:       data?.radarData       ?? [],
    weeklyXP:        data?.weeklyXP        ?? [],
    topGoals:        data?.topGoals        ?? [],
    recentActivity:  data?.recentActivity  ?? [],
    macros:          data?.macros          ?? { protein: 0, carbs: 0, fat: 0, totalCalories: 0 },
    waterCups:       data?.waterCups       ?? 0,
    waterGoal:       data?.waterGoal       ?? 8,
    sleepHours:      data?.sleepHours      ?? 0,
  };

  if (isLoading) return <DashboardSkeleton />;

  const xpTrend = stats.todayXP > stats.yesterdayXP ? 'up' : 'down';
  const xpDiff = Math.abs(stats.todayXP - stats.yesterdayXP);
  const inPenitence = character?.inPenitence === true;

  return (
    <>
      {/* YOU DIED overlay */}
      <AnimatePresence>
        {inPenitence && <YouDiedScreen key="you-died" />}
      </AnimatePresence>

    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <DynamicGreeting username={username} streak={stats.currentStreak} />
        <QuickActions />
      </div>

      {/* Row 1: Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="XP de Hoy"
          value={stats.todayXP.toString()}
          sub="vs ayer"
          icon={<Zap className="w-5 h-5 text-yellow-400" />}
          trend={xpTrend}
          trendValue={`${xpDiff} XP`}
          glowColor="#EAB308"
          delay={0}
        />
        <StatCard
          label="Racha Activa"
          value={`${stats.currentStreak}d`}
          sub="días seguidos"
          icon={<Flame className="w-5 h-5 text-orange-400" />}
          trend="up"
          trendValue="¡en racha!"
          glowColor="#FB923C"
          delay={0.1}
        />
        <StatCard
          label="Juramentos"
          value={`${stats.habitsCompleted}/${stats.habitsTotal}`}
          sub="sellados hoy"
          icon={<CheckCircle className="w-5 h-5 text-green-400" />}
          trend={stats.habitsCompleted === stats.habitsTotal ? 'up' : 'neutral'}
          trendValue={stats.habitsCompleted === stats.habitsTotal ? '¡Todos sellados!' : `${stats.habitsTotal - stats.habitsCompleted} pendientes`}
          glowColor="#22C55E"
          delay={0.2}
        />
        <StatCard
          label="Taberna"
          value={stats.caloriesConsumed.toString()}
          sub={`de ${stats.caloriesGoal} kcal`}
          icon={<Utensils className="w-5 h-5 text-[#DC143C]" />}
          trend={stats.caloriesConsumed <= stats.caloriesGoal ? 'up' : 'down'}
          trendValue={`${Math.abs(stats.caloriesConsumed - stats.caloriesGoal)} kcal ${stats.caloriesConsumed <= stats.caloriesGoal ? 'restantes' : 'excedidas'}`}
          glowColor="#DC143C"
          delay={0.3}
        />
      </div>

      {/* Row 2: Activity Heatmap — hidden on mobile (touch-scroll conflict) */}
      <div className="hidden md:block">
        <ActivityHeatmap data={stats.activityHeatmap} />
      </div>

      {/* Row 3: Radar + Weekly XP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RadarChart data={stats.radarData} />
        <WeeklyXPChart data={stats.weeklyXP} />
      </div>

      {/* Row 4: Goals + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GoalProgressCard goals={stats.topGoals} />
        <ActivityFeed activities={stats.recentActivity} />
      </div>

      {/* Row 5: Macros + Water + Sleep */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MacroDonut macros={stats.macros} />
        <WaterTracker cups={stats.waterCups} goal={stats.waterGoal} />
        <SleepDisplay hours={stats.sleepHours} />
      </div>

      {/* Row 6: RPG Combo + Missions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ComboCard />
        <MissionsPanel />
      </div>

      {/* Row 7: Rewards / Achievements */}
      <RewardsPanel />
    </div>
    </>
  );
}
