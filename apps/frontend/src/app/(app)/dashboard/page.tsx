'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Zap,
  Flame,
  CheckCircle,
  Utensils,
  Droplets,
  Moon,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { dashboardApi } from '@/lib/api';
import type { DashboardStats } from '@/types';
import ActivityHeatmap from '@/components/dashboard/ActivityHeatmap';
import RadarChart from '@/components/dashboard/RadarChart';
import WeeklyXPChart from '@/components/dashboard/WeeklyXPChart';
import GoalProgressCard from '@/components/dashboard/GoalProgressCard';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import MacroDonut from '@/components/dashboard/MacroDonut';

/* ─── Mock data fallback ──────────────────────────────────────────────── */
const mockStats: DashboardStats = {
  todayXP: 340,
  yesterdayXP: 280,
  currentStreak: 14,
  habitsCompleted: 5,
  habitsTotal: 7,
  caloriesConsumed: 1840,
  caloriesGoal: 2200,
  activityHeatmap: Array.from({ length: 365 }, (_, i) => ({
    date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
    count: Math.random() > 0.35 ? Math.floor(Math.random() * 10) : 0,
  })),
  radarData: [
    { subject: 'Gym', value: 82, fullMark: 100 },
    { subject: 'Nutrition', value: 71, fullMark: 100 },
    { subject: 'Cardio', value: 55, fullMark: 100 },
    { subject: 'Learning', value: 90, fullMark: 100 },
    { subject: 'Habits', value: 76, fullMark: 100 },
    { subject: 'Goals', value: 63, fullMark: 100 },
  ],
  weeklyXP: [
    { day: 'Mon', xp: 220 },
    { day: 'Tue', xp: 310 },
    { day: 'Wed', xp: 180 },
    { day: 'Thu', xp: 450 },
    { day: 'Fri', xp: 340 },
    { day: 'Sat', xp: 120 },
    { day: 'Sun', xp: 290 },
  ],
  topGoals: [
    {
      id: '1',
      title: 'Bench Press 100kg',
      description: '',
      category: 'fitness',
      targetValue: 100,
      currentValue: 82,
      unit: 'kg',
      deadline: new Date(Date.now() + 60 * 86400000).toISOString(),
      priority: 'high',
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Read 20 books',
      description: '',
      category: 'learning',
      targetValue: 20,
      currentValue: 11,
      unit: 'books',
      deadline: new Date(Date.now() + 120 * 86400000).toISOString(),
      priority: 'medium',
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      title: 'Save $5000',
      description: '',
      category: 'finance',
      targetValue: 5000,
      currentValue: 3200,
      unit: 'USD',
      deadline: new Date(Date.now() + 90 * 86400000).toISOString(),
      priority: 'critical',
      completed: false,
      createdAt: new Date().toISOString(),
    },
  ],
  recentActivity: [
    {
      id: '1',
      type: 'gym',
      description: 'Completed Push Day — 6 exercises, 18 sets',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      xpGained: 120,
    },
    {
      id: '2',
      type: 'habit',
      description: 'Morning meditation — 20 minutes',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      xpGained: 30,
    },
    {
      id: '3',
      type: 'nutrition',
      description: 'Logged lunch — 650 kcal',
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      xpGained: 15,
    },
    {
      id: '4',
      type: 'cardio',
      description: '5km morning run — 24:32',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      xpGained: 80,
    },
    {
      id: '5',
      type: 'goal',
      description: 'Updated progress on Bench Press goal',
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      xpGained: 25,
    },
  ],
  macros: { protein: 162, carbs: 210, fat: 68, totalCalories: 1840 },
  waterCups: 5,
  waterGoal: 8,
  sleepHours: 7.5,
};

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

/* ─── Water Tracker ─────────────────────────────────────────────────── */
function WaterTracker({ cups, goal }: { cups: number; goal: number }) {
  const [current, setCurrent] = useState(cups);

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Droplets className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Water</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: goal }).map((_, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrent(i < current ? i : i + 1)}
            className={`w-9 h-9 rounded-full border-2 transition-all ${
              i < current
                ? 'bg-blue-500 border-blue-400 text-white'
                : 'bg-transparent border-gray-700 text-gray-600'
            }`}
          >
            <Droplets className="w-4 h-4 mx-auto" />
          </motion.button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        {current}/{goal} glasses · {(current * 250) / 1000}L
      </p>
    </div>
  );
}

/* ─── Sleep Display ─────────────────────────────────────────────────── */
function SleepDisplay({ hours }: { hours: number }) {
  const quality = hours >= 8 ? 'Excellent' : hours >= 7 ? 'Good' : hours >= 6 ? 'Fair' : 'Poor';
  const qualityColor = hours >= 8 ? 'text-green-400' : hours >= 7 ? 'text-blue-400' : hours >= 6 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Moon className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Sleep</h3>
      </div>
      <div className="text-4xl font-bold text-white">{hours}h</div>
      <div className={`text-sm font-semibold mt-1 ${qualityColor}`}>{quality}</div>
      <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(hours / 9) * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-indigo-800 to-indigo-500"
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">Goal: 8h</p>
    </div>
  );
}

/* ─── Loading Skeleton ──────────────────────────────────────────────── */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-white/5" />
        ))}
      </div>
      <div className="h-48 rounded-2xl bg-white/5" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-80 rounded-2xl bg-white/5" />
        <div className="h-80 rounded-2xl bg-white/5" />
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await dashboardApi.stats();
      return res.data as DashboardStats;
    },
    staleTime: 60_000,
  });

  const stats = data ?? mockStats;

  if (isLoading) return <DashboardSkeleton />;

  const xpTrend = stats.todayXP > stats.yesterdayXP ? 'up' : 'down';
  const xpDiff = Math.abs(stats.todayXP - stats.yesterdayXP);

  return (
    <div className="space-y-6 pb-8">
      {/* Row 1: Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's XP"
          value={stats.todayXP.toString()}
          sub="vs yesterday"
          icon={<Zap className="w-5 h-5 text-yellow-400" />}
          trend={xpTrend}
          trendValue={`${xpDiff} XP`}
          glowColor="#EAB308"
          delay={0}
        />
        <StatCard
          label="Streak"
          value={`${stats.currentStreak}d`}
          sub="days in a row"
          icon={<Flame className="w-5 h-5 text-orange-400" />}
          trend="up"
          trendValue="on fire!"
          glowColor="#FB923C"
          delay={0.1}
        />
        <StatCard
          label="Habits"
          value={`${stats.habitsCompleted}/${stats.habitsTotal}`}
          sub="completed today"
          icon={<CheckCircle className="w-5 h-5 text-green-400" />}
          trend={stats.habitsCompleted === stats.habitsTotal ? 'up' : 'neutral'}
          trendValue={stats.habitsCompleted === stats.habitsTotal ? 'All done!' : `${stats.habitsTotal - stats.habitsCompleted} left`}
          glowColor="#22C55E"
          delay={0.2}
        />
        <StatCard
          label="Calories"
          value={stats.caloriesConsumed.toString()}
          sub={`of ${stats.caloriesGoal} goal`}
          icon={<Utensils className="w-5 h-5 text-[#DC143C]" />}
          trend={stats.caloriesConsumed <= stats.caloriesGoal ? 'up' : 'down'}
          trendValue={`${Math.abs(stats.caloriesConsumed - stats.caloriesGoal)} kcal ${stats.caloriesConsumed <= stats.caloriesGoal ? 'remaining' : 'over'}`}
          glowColor="#DC143C"
          delay={0.3}
        />
      </div>

      {/* Row 2: Activity Heatmap */}
      <ActivityHeatmap data={stats.activityHeatmap} />

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
    </div>
  );
}
