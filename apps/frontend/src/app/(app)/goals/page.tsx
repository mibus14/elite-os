'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Plus, X, Dumbbell, BookOpen, DollarSign, Star,
  Check, Calendar, ChevronDown, ChevronUp, Trash2, Zap, RotateCcw,
} from 'lucide-react';
import { goalsApi, rpgApi } from '@/lib/api';
import toast from 'react-hot-toast';

/* ─── Tipos ──────────────────────────────────────────────────────── */
interface Milestone {
  id: string;
  title: string;
  weight: number;
  completed: boolean;
  order: number;
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  category: 'fitness' | 'learning' | 'finance' | 'personal';
  targetValue: number;
  currentValue: number;
  unit?: string;
  deadline?: string;
  status: 'active' | 'completed';
  priority: 'low' | 'medium' | 'high';
  milestones: Milestone[];
  progressPercent: number;
}

interface QuickMission {
  id: string;
  title: string;
  icon: string;
  xp: number;
  category: string;
  completedToday: boolean;
}

/* ─── Config visual ──────────────────────────────────────────────── */
const CAT = {
  fitness:  { icon: Dumbbell,   color: '#DC143C', bg: 'bg-[#DC143C]/10', border: 'border-[#DC143C]/20', text: 'text-[#DC143C]',   label: 'Fitness' },
  learning: { icon: BookOpen,   color: '#3B82F6', bg: 'bg-blue-500/10',  border: 'border-blue-500/20',  text: 'text-blue-400',    label: 'Aprendizaje' },
  finance:  { icon: DollarSign, color: '#22C55E', bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400',   label: 'Finanzas' },
  personal: { icon: Star,       color: '#8B5CF6', bg: 'bg-purple-500/10',border: 'border-purple-500/20',text: 'text-purple-400',  label: 'Personal' },
} as const;

const PRIORITY_COLORS = {
  high:   'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low:    'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

/* ─── Micro-misiones ─────────────────────────────────────────────── */
function QuickMissionsPanel() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['quick-missions'],
    queryFn: async () => {
      const res = await rpgApi.quickMissions();
      return res.data as { missions: QuickMission[]; earnedToday: number; dailyCap: number };
    },
    refetchInterval: 60_000,
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => rpgApi.completeQuickMission(id),
    onSuccess: (res, id) => {
      const xp = res.data.xpAwarded;
      toast.success(`+${xp} XP`, { icon: '⚡' });
      qc.invalidateQueries({ queryKey: ['quick-missions'] });
      qc.invalidateQueries({ queryKey: ['rpg-character'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? 'Error al completar misión');
    },
  });

  if (isLoading) {
    return (
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-5">
        <div className="h-4 w-40 bg-white/5 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const missions = data?.missions ?? [];
  const earned = data?.earnedToday ?? 0;
  const cap = data?.dailyCap ?? 30;
  const allDone = missions.every((m) => m.completedToday);

  return (
    <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1E1E1E] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-bold text-white uppercase tracking-wide">Misiones Rápidas</span>
          <span className="text-xs text-gray-600">— completa una vez al día</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-yellow-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (earned / cap) * 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-xs text-gray-500 font-mono">{earned}/{cap} XP</span>
        </div>
      </div>

      {/* Grid de misiones */}
      <div className="p-4 grid grid-cols-3 sm:grid-cols-5 gap-2">
        {missions.map((m) => {
          const done = m.completedToday;
          const busy = completeMutation.isPending && completeMutation.variables === m.id;
          return (
            <motion.button
              key={m.id}
              whileTap={done ? {} : { scale: 0.93 }}
              onClick={() => !done && !busy && completeMutation.mutate(m.id)}
              disabled={done || busy}
              className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 border text-center transition-all ${
                done
                  ? 'bg-green-500/10 border-green-500/30 cursor-default'
                  : 'bg-white/3 border-white/10 hover:border-white/20 hover:bg-white/6 cursor-pointer'
              }`}
            >
              {done && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </div>
              )}
              <span className="text-xl leading-none">{m.icon}</span>
              <span className={`text-[10px] font-medium leading-tight ${done ? 'text-green-400' : 'text-gray-400'}`}>
                {m.title}
              </span>
              <span className={`text-[10px] font-bold ${done ? 'text-green-500' : 'text-yellow-400'}`}>
                +{m.xp} XP
              </span>
            </motion.button>
          );
        })}
      </div>

      {allDone && (
        <div className="px-5 pb-4 text-center text-xs text-green-400 font-semibold">
          ¡Todas las misiones rápidas completadas hoy! 🎉
        </div>
      )}
    </div>
  );
}

/* ─── Goal Card ──────────────────────────────────────────────────── */
function GoalCard({ goal, onToggle, onDelete, onReactivate }: {
  goal: Goal;
  onToggle: (goalId: string, milestoneId: string) => void;
  onDelete: (goalId: string) => void;
  onReactivate: (goalId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const cat = CAT[goal.category];
  const Icon = cat.icon;
  const isCompleted = goal.status === 'completed' || goal.progressPercent >= 100;
  const completedMilestones = goal.milestones.filter((m) => m.completed).length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border overflow-hidden transition-colors ${
        isCompleted ? 'bg-green-950/20 border-green-500/30' : 'bg-white/5 border-white/10 hover:border-white/20'
      }`}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`p-2 rounded-xl ${cat.bg}`}>
              <Icon className="w-4 h-4" style={{ color: cat.color }} />
            </div>
            <span className={`text-xs font-semibold ${cat.text}`}>{cat.label}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[goal.priority]}`}>
              {{ low: 'Baja', medium: 'Media', high: 'Alta' }[goal.priority]}
            </span>
            {isCompleted && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full border border-green-500/40 bg-green-500/10 text-green-400">
                ✓ Completada
              </span>
            )}
          </div>
          {!isCompleted && (
            <button onClick={() => onDelete(goal.id)} className="text-gray-700 hover:text-red-400 transition-colors p-1 flex-shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <h3 className="text-white font-bold text-base mb-3">{goal.title}</h3>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
              {completedMilestones} de {goal.milestones.length} hitos
            </span>
            <span className={`text-xs font-bold ${isCompleted ? 'text-green-400' : 'text-[#DC143C]'}`}>
              {goal.progressPercent}%
            </span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${goal.progressPercent}%` }}
              transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              className={`h-full rounded-full ${isCompleted ? 'bg-green-500' : 'bg-[#DC143C]'}`}
            />
          </div>
        </div>

        {goal.deadline && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-600">
            <Calendar className="w-3 h-3" />
            <span>{new Date(goal.deadline).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        )}

        {/* Completed goal actions */}
        {isCompleted && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onReactivate(goal.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-semibold hover:bg-blue-500/20 transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              Reactivar
            </button>
            <button
              onClick={() => onDelete(goal.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="w-3 h-3" />
              Eliminar
            </button>
          </div>
        )}
      </div>

      {/* Milestones */}
      {goal.milestones.length > 0 && (
        <div className="border-t border-white/5">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full px-5 py-2.5 flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <span>Hitos</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-4 space-y-2">
                  {goal.milestones.map((m) => (
                    <motion.button
                      key={m.id}
                      layout
                      onClick={() => !isCompleted && onToggle(goal.id, m.id)}
                      disabled={isCompleted}
                      className={`w-full flex items-center gap-3 text-left ${isCompleted ? 'cursor-default opacity-60' : 'group'}`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        m.completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-white/20 group-hover:border-white/40'
                      }`}>
                        {m.completed && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </div>
                      <span className={`text-sm transition-colors ${m.completed ? 'line-through text-gray-600' : 'text-gray-300 group-hover:text-white'}`}>
                        {m.title}
                      </span>
                      <span className="ml-auto text-xs text-gray-600 flex-shrink-0">+{m.weight}%</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Modal crear meta ───────────────────────────────────────────── */
function CreateGoalModal({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: object) => void;
}) {
  const [form, setForm] = useState({
    title: '', category: 'fitness' as keyof typeof CAT,
    deadline: '', priority: 'medium' as 'low' | 'medium' | 'high',
  });
  const [milestones, setMilestones] = useState<{ title: string; weight: number }[]>([]);
  const [newHito, setNewHito] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function addHito() {
    const title = newHito.trim();
    if (!title) return;
    const next = [...milestones, { title, weight: 0 }];
    // Redistribute weights equally
    const per = Math.floor(100 / next.length);
    const rem = 100 - per * next.length;
    const reweighted = next.map((m, i) => ({ ...m, weight: per + (i === next.length - 1 ? rem : 0) }));
    setMilestones(reweighted);
    setNewHito('');
  }

  function removeHito(idx: number) {
    const next = milestones.filter((_, i) => i !== idx);
    if (next.length === 0) { setMilestones([]); return; }
    const per = Math.floor(100 / next.length);
    const rem = 100 - per * next.length;
    setMilestones(next.map((m, i) => ({ ...m, weight: per + (i === next.length - 1 ? rem : 0) })));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onCreate({ ...form, milestones: milestones.length > 0 ? milestones : undefined });
    setForm({ title: '', category: 'fitness', deadline: '', priority: 'medium' });
    setMilestones([]);
    setNewHito('');
    onClose();
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 w-full max-w-lg max-h-[90dvh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black text-white uppercase tracking-wide">⚔ Nueva Misión</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Título */}
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5 block">Título</label>
              <input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="ej. Press de banca 100kg"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#DC143C]/50 transition-all"
                required
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5 block">Categoría</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.entries(CAT) as [keyof typeof CAT, typeof CAT[keyof typeof CAT]][]).map(([key, c]) => {
                  const Ic = c.icon;
                  return (
                    <button key={key} type="button" onClick={() => set('category', key)}
                      className={`py-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                        form.category === key ? `${c.bg} ${c.border} ${c.text}` : 'border-white/10 bg-white/5 text-gray-500'
                      }`}
                    >
                      <Ic className="w-4 h-4" />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fecha + Prioridad */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5 block">Fecha límite</label>
                <input type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#DC143C]/50 transition-all" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5 block">Prioridad</label>
                <div className="flex gap-1.5">
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <button key={p} type="button" onClick={() => set('priority', p)}
                      className={`flex-1 py-2.5 text-xs rounded-xl border font-semibold transition-all ${
                        form.priority === p ? PRIORITY_COLORS[p] : 'border-white/10 text-gray-600'
                      }`}
                    >
                      {{ low: 'Baja', medium: 'Media', high: 'Alta' }[p]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Hitos manuales */}
            <div className="space-y-3">
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block">
                Hitos <span className="text-gray-700 normal-case">(opcional)</span>
              </label>

              {/* Input agregar hito */}
              <div className="flex gap-2">
                <input
                  value={newHito}
                  onChange={(e) => setNewHito(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHito(); } }}
                  placeholder="Describe un hito de tu meta..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#DC143C]/50 transition-all"
                />
                <button
                  type="button"
                  onClick={addHito}
                  disabled={!newHito.trim()}
                  className="px-3 py-2.5 rounded-xl bg-[#DC143C]/10 border border-[#DC143C]/30 text-[#DC143C] hover:bg-[#DC143C]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Lista de hitos */}
              {milestones.length > 0 ? (
                <div className="space-y-1.5">
                  {milestones.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white/3 border border-white/8 rounded-xl px-3 py-2">
                      <div className="w-5 h-5 rounded-full border-2 border-white/20 flex-shrink-0" />
                      <span className="text-sm text-gray-300 flex-1">{m.title}</span>
                      <span className="text-xs text-gray-600 flex-shrink-0">+{m.weight}%</span>
                      <button type="button" onClick={() => removeHito(i)} className="text-gray-700 hover:text-red-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-gray-600 text-right">
                    {milestones.length} hito{milestones.length !== 1 ? 's' : ''} · pesos distribuidos automáticamente
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-700 text-center py-2">
                  Sin hitos — la meta avanzará con progreso manual
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 text-sm font-semibold hover:border-white/20 transition-all">
                Cancelar
              </button>
              <motion.button type="submit" whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 rounded-xl bg-[#DC143C] text-white text-sm font-bold transition-all"
                style={{ boxShadow: '0 0 20px rgba(220,20,60,0.3)' }}>
                Crear Meta
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Page ───────────────────────────────────────────────────────── */
const FILTER_TABS = ['Todas', 'Fitness', 'Aprendizaje', 'Finanzas', 'Personal', 'Completadas'] as const;
type FilterTab = typeof FILTER_TABS[number];
const TAB_TO_CAT: Record<string, string> = { Fitness: 'fitness', Aprendizaje: 'learning', Finanzas: 'finance', Personal: 'personal' };

export default function GoalsPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('Todas');

  const { data: goalsData, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await goalsApi.list();
      return (res.data?.goals ?? res.data) as Goal[];
    },
  });

  const goals: Goal[] = Array.isArray(goalsData) ? goalsData : [];

  const createMutation = useMutation({
    mutationFn: (data: object) => goalsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success('¡Meta creada!'); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ goalId, mid }: { goalId: string; mid: string }) => goalsApi.toggleMilestone(goalId, mid),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      if (res.data?.justCompleted) {
        qc.invalidateQueries({ queryKey: ['rpg-character'] });
        qc.invalidateQueries({ queryKey: ['rpg-combo'] });
        toast.success('¡Meta completada! +100 XP', { icon: '🏆' });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => goalsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success('Meta eliminada'); },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => goalsApi.reactivate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success('¡Misión reactivada! Sigue adelante.'); },
    onError: () => toast.error('Error al reactivar'),
  });

  const filtered = goals.filter((g) => {
    if (filter === 'Todas') return true;
    if (filter === 'Completadas') return g.status === 'completed';
    return g.category === TAB_TO_CAT[filter];
  });

  const activeCount    = goals.filter((g) => g.status === 'active').length;
  const completedCount = goals.filter((g) => g.status === 'completed').length;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 uppercase tracking-wide">
            <Target className="w-7 h-7 text-[#DC143C]" />
            Misiones
          </h1>
          <p className="text-gray-500 mt-1">{activeCount} activas · {completedCount} conquistadas</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#DC143C] rounded-xl text-white font-semibold text-sm flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva Misión</span>
          <span className="sm:hidden">Misión</span>
        </motion.button>
      </div>

      {/* Micro-misiones diarias */}
      <QuickMissionsPanel />

      {/* Filtros */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10 w-fit flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button key={tab} onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === tab ? 'bg-[#DC143C] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid de metas */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-56 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold">Sin metas aún</p>
          <p className="text-sm mt-1">Crea tu primera meta para comenzar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onToggle={(goalId, mid) => toggleMutation.mutate({ goalId, mid })}
              onDelete={(id) => deleteMutation.mutate(id)}
              onReactivate={(id) => reactivateMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      <CreateGoalModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={(data) => createMutation.mutate(data)}
      />
    </div>
  );
}
