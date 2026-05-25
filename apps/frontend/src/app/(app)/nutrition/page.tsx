'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Utensils, Plus, Flame, Trash2,
  ShieldAlert, Home, Leaf,
  Sun, Sunset, Moon, Cookie, Settings2, ChevronDown,
} from 'lucide-react';
import { format, isValid } from 'date-fns';

function safeFormat(dateVal: unknown, fmt: string, fallback = '—'): string {
  try {
    const d = new Date(dateVal as string)
    return isValid(d) ? format(d, fmt) : fallback
  } catch { return fallback }
}
import { nutritionApi, getLocalDate } from '@/lib/api';
import toast from 'react-hot-toast';
import QuickNutritionModal from '@/components/nutrition/QuickNutritionModal';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

/* ─── Constantes ─────────────────────────────────────────────────── */
const DEFAULT_GOALS = { calories: 2200, protein: 160, carbs: 280, fat: 75, fiber: 30 };

type Category = 'BAD' | 'HOMEMADE_CAL' | 'HEALTHY';
type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const CATEGORIES: {
  id: Category;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  text: string;
  ring: string;
}[] = [
  {
    id: 'BAD',
    label: 'Comida Mala',
    sub: 'Rápida · Procesada',
    icon: ShieldAlert,
    color: '#EF4444',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    ring: 'border-red-500/30',
  },
  {
    id: 'HOMEMADE_CAL',
    label: 'Casera Calórica',
    sub: 'Hecha en casa · Densa',
    icon: Home,
    color: '#F59E0B',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    ring: 'border-yellow-500/30',
  },
  {
    id: 'HEALTHY',
    label: 'Comer Bien',
    sub: 'Balanceada · Limpia',
    icon: Leaf,
    color: '#22C55E',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    ring: 'border-green-500/30',
  },
];

const MEAL_TIMES: {
  id: MealTime;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'breakfast', label: 'Desayuno', icon: Sun },
  { id: 'lunch',     label: 'Comida',   icon: Sunset },
  { id: 'dinner',    label: 'Cena',     icon: Moon },
  { id: 'snack',     label: 'Snack',    icon: Cookie },
];

/* ─── Calorie ring ───────────────────────────────────────────────── */
function CalorieRing({ current, goal }: { current: number; goal: number }) {
  const pct = Math.min(current / goal, 1);
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const over = current > goal;

  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1A1A1A" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={over ? '#EF4444' : '#DC143C'}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
      <div className="text-center z-10">
        <div className={`text-xl font-bold ${over ? 'text-red-400' : 'text-white'}`}>{current}</div>
        <div className="text-[10px] text-gray-500">/ {goal} kcal</div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function NutritionPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [meals, setMeals] = useState<any[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, number>>({ BAD: 0, HOMEMADE_CAL: 0, HEALTHY: 0 });
  const [weekStats, setWeekStats] = useState<any[]>([]);
  const [goalsForm, setGoalsForm] = useState(DEFAULT_GOALS);

  const todayKey = getLocalDate()
  const { data: todayData } = useQuery({
    queryKey: ['nutrition', 'today', todayKey],
    queryFn: async () => {
      const res = await nutritionApi.today();
      return res.data;
    },
  });

  const { data: weeklyData } = useQuery({
    queryKey: ['nutrition', 'weekly'],
    queryFn: async () => {
      const res = await nutritionApi.weeklyStats();
      return res.data;
    },
  });

  const { data: goalsData } = useQuery({
    queryKey: ['nutrition', 'goals'],
    queryFn: () => nutritionApi.goals().then(r => r.data.goals),
    staleTime: 300_000,
  });

  useEffect(() => {
    if (goalsData) setGoalsForm(goalsData);
  }, [goalsData]);

  const goalsMutation = useMutation({
    mutationFn: (data: typeof DEFAULT_GOALS) => nutritionApi.setGoals(data),
    onSuccess: (res) => {
      qc.setQueryData(['nutrition', 'goals'], res.data.goals);
      setGoalsOpen(false);
      toast.success('Objetivos guardados');
    },
    onError: () => toast.error('Error al guardar'),
  });

  const myGoals = goalsData ?? DEFAULT_GOALS;

  useEffect(() => {
    if (todayData) {
      setMeals(todayData.meals ?? []);
      setByCategory(todayData.byCategory ?? { BAD: 0, HOMEMADE_CAL: 0, HEALTHY: 0 });
    }
  }, [todayData]);

  useEffect(() => {
    if (weeklyData?.stats) {
      setWeekStats(weeklyData.stats.map((d: any) => ({
        ...d,
        day: safeFormat(d.date ? d.date + 'T12:00:00' : null, 'EEE'),
      })));
    }
  }, [weeklyData]);

  const removeMutation = useMutation({
    mutationFn: (id: string) => nutritionApi.removeMeal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nutrition', 'today'] }); // prefix match invalidates all dates
      toast.success('Eliminado');
    },
  });

  const totalCalories = meals.reduce((s: number, m: any) => s + (m.calories || 0), 0);
  const totalMacros = todayData?.totals ?? { protein: 0, carbs: 0, fat: 0, fiber: 0 };

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 uppercase tracking-wide">
            <Utensils className="w-7 h-7 text-[#DC143C]" />
            Taberna
          </h1>
          <p className="text-gray-500 mt-1">El combustible de tu aventura</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            style={{ touchAction: 'manipulation' }}
            onClick={() => setGoalsOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-400 text-sm"
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Objetivos</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${goalsOpen ? 'rotate-180' : ''}`} />
          </button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            style={{ touchAction: 'manipulation' }}
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#DC143C] rounded-xl text-white font-semibold text-sm flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Registrar
          </motion.button>
        </div>
      </div>

      {/* Goals panel */}
      {goalsOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-elite-600" />
            Mis objetivos diarios
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([
              { key: 'calories', label: 'Calorías', unit: 'kcal', min: 800, max: 5000 },
              { key: 'protein',  label: 'Proteína',  unit: 'g',    min: 0,   max: 400 },
              { key: 'carbs',    label: 'Carbohidratos', unit: 'g', min: 0,  max: 600 },
              { key: 'fat',      label: 'Grasa',     unit: 'g',    min: 0,   max: 300 },
              { key: 'fiber',    label: 'Fibra',     unit: 'g',    min: 0,   max: 100 },
            ] as const).map(({ key, label, unit, min, max }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium">{label} <span className="text-gray-600">({unit})</span></label>
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={goalsForm[key]}
                  onChange={e => setGoalsForm(f => ({ ...f, [key]: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-elite-600/50"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            style={{ touchAction: 'manipulation' }}
            disabled={goalsMutation.isPending}
            onClick={() => goalsMutation.mutate(goalsForm)}
            className="w-full py-2.5 rounded-xl bg-elite-600 text-white text-sm font-bold disabled:opacity-50 transition-all"
          >
            {goalsMutation.isPending ? 'Guardando...' : 'Guardar objetivos'}
          </button>
        </motion.div>
      )}

      {/* Resumen del día: anillo + 3 categorías */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Anillo total */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col items-center justify-center gap-2"
        >
          <CalorieRing current={totalCalories} goal={myGoals.calories} />
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total hoy</p>
        </motion.div>

        {/* 3 tarjetas de categoría */}
        {CATEGORIES.map((cat, i) => {
          const kcal = (byCategory as any)?.[cat.id] ?? 0;
          const Icon = cat.icon;
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i + 1) * 0.08 }}
              className={`rounded-2xl bg-white/5 border ${cat.ring} p-5 flex flex-col gap-3`}
            >
              <div className={`w-10 h-10 rounded-xl ${cat.bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${cat.text}`} />
              </div>
              <div>
                <p className="text-white font-bold text-xl">{kcal} <span className="text-sm font-normal text-gray-500">kcal</span></p>
                <p className={`text-sm font-semibold ${cat.text}`}>{cat.label}</p>
                <p className="text-xs text-gray-600">{cat.sub}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Macro totals bar */}
      {(totalMacros.protein > 0 || totalMacros.carbs > 0 || totalMacros.fat > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-white/5 border border-white/10 p-5"
        >
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Macros de hoy</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Proteína', value: totalMacros.protein, goal: myGoals.protein, color: 'bg-blue-500', text: 'text-blue-400', unit: 'g' },
              { label: 'Carbohidratos', value: totalMacros.carbs, goal: myGoals.carbs, color: 'bg-yellow-500', text: 'text-yellow-400', unit: 'g' },
              { label: 'Grasa', value: totalMacros.fat, goal: myGoals.fat, color: 'bg-red-500', text: 'text-red-400', unit: 'g' },
            ].map(({ label, value, goal, color, text, unit }) => {
              const pct = Math.min(100, goal > 0 ? (value / goal) * 100 : 0)
              return (
                <div key={label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className={`text-xs font-bold ${text}`}>{value}{unit}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                      className={`h-full rounded-full ${color}`}
                    />
                  </div>
                  <p className="text-[10px] text-gray-600">/ {goal}{unit}</p>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Lista de comidas de hoy por momento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MEAL_TIMES.map((mt, ti) => {
          const Icon = mt.icon;
          const items = meals.filter((m: any) => m.mealType === mt.id);
          const total = items.reduce((s: number, m: any) => s + (m.calories || 0), 0);
          return (
            <motion.div
              key={mt.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ti * 0.07 }}
              className="rounded-2xl bg-white/5 border border-white/10 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-400" />
                  <span className="text-white font-semibold text-sm">{mt.label}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Flame className="w-3 h-3" />
                  {total} kcal
                </div>
              </div>

              {items.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-3">Sin registros</p>
              ) : (
                <div className="space-y-2">
                  {items.map((meal: any) => {
                    const cat = CATEGORIES.find((c) => c.id === meal.category);
                    return (
                      <div
                        key={meal.id}
                        className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {cat && (
                            <span className={`w-2 h-2 rounded-full flex-shrink-0`} style={{ backgroundColor: cat.color }} />
                          )}
                          <span className="text-sm text-gray-300 truncate">{meal.name}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                          <span className="text-sm font-bold text-white">{meal.calories}</span>
                          <button
                            onClick={() => removeMutation.mutate(meal.id)}
                            className="text-gray-700 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Gráfica semanal por categoría */}
      {weekStats.length === 0 && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
          <Flame className="w-10 h-10 mx-auto mb-2 text-gray-700" />
          <p className="text-sm text-gray-600">Registra comidas para ver tu historial semanal</p>
        </div>
      )}
      {weekStats.length > 0 && <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl bg-white/5 border border-white/10 p-6"
      >
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Calorías esta semana
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weekStats} barSize={14} barGap={2} margin={{ left: -20 }}>
            <CartesianGrid stroke="#1A1A1A" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#111111', border: '1px solid #1A1A1A', borderRadius: 8, color: '#fff', fontSize: 12 }}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="bad"  name="Comida Mala"      stackId="a" fill="#EF4444" radius={[0,0,0,0]} />
            <Bar dataKey="home" name="Casera Calórica"   stackId="a" fill="#F59E0B" radius={[0,0,0,0]} />
            <Bar dataKey="good" name="Comer Bien"        stackId="a" fill="#22C55E" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
        {/* Leyenda */}
        <div className="flex items-center gap-4 mt-3 justify-center">
          {[
            { color: '#EF4444', label: 'Comida Mala' },
            { color: '#F59E0B', label: 'Casera Calórica' },
            { color: '#22C55E', label: 'Comer Bien' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
              <span className="text-xs text-gray-500">{l.label}</span>
            </div>
          ))}
        </div>
      </motion.div>}

      {/* Modal */}
      <QuickNutritionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
