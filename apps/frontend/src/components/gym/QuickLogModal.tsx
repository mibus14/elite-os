'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Zap, Calendar } from 'lucide-react';
import { gymApi } from '@/lib/api';
import toast from 'react-hot-toast';

/* ─── Periodización mensual ─────────────────────────────────────────── */
// Ciclo anual en 4 fases de 3 meses, todas base Upper / Lower hipertrofia

interface WorkoutOption {
  name: string;   // guardado en BD
  label: string;  // texto del botón (corto)
  sub: string;    // grupos musculares
  color: string;
  active: string;
}

interface MonthPlan {
  phase: string;
  reps: string;
  phaseNum: number;
  workouts: WorkoutOption[];
}

// Colores fijos por slot (posición en grid), independiente de la fase
const SLOT_COLORS: Array<{ color: string; active: string }> = [
  { color: 'border-red-500/40 bg-red-500/8 text-red-300',      active: 'border-red-400 bg-red-500/25 text-red-100' },
  { color: 'border-orange-500/40 bg-orange-500/8 text-orange-300', active: 'border-orange-400 bg-orange-500/25 text-orange-100' },
  { color: 'border-blue-500/40 bg-blue-500/8 text-blue-300',    active: 'border-blue-400 bg-blue-500/25 text-blue-100' },
  { color: 'border-purple-500/40 bg-purple-500/8 text-purple-300', active: 'border-purple-400 bg-purple-500/25 text-purple-100' },
  { color: 'border-yellow-500/40 bg-yellow-500/8 text-yellow-300', active: 'border-yellow-400 bg-yellow-500/25 text-yellow-100' },
  { color: 'border-cyan-500/40 bg-cyan-500/8 text-cyan-300',    active: 'border-cyan-400 bg-cyan-500/25 text-cyan-100' },
];

function wt(name: string, label: string, sub: string, slot: number): WorkoutOption {
  return { name, label, sub, ...SLOT_COLORS[slot] };
}

// month: 1-12
function getMonthPlan(month: number): MonthPlan {
  // Fase 1: Ene–Mar  — Hipertrofia Base (8-12)
  if (month <= 3) return {
    phase: 'Hipertrofia Base', reps: '8-12 reps', phaseNum: 1,
    workouts: [
      wt('Upper A · Hipertrofia Base', 'Upper A', 'Pecho · Espalda', 0),
      wt('Upper B · Hipertrofia Base', 'Upper B', 'Hombros · Brazos', 1),
      wt('Lower A · Hipertrofia Base', 'Lower A', 'Cuádriceps', 2),
      wt('Lower B · Hipertrofia Base', 'Lower B', 'Isquios · Glúteos', 3),
      wt('Full Body · Hipertrofia Base', 'Full Body', 'Todo el cuerpo', 4),
      wt('Cardio', 'Cardio', 'Resistencia', 5),
    ],
  };

  // Fase 2: Abr–Jun  — Fuerza-Hipertrofia (5-8)
  if (month <= 6) return {
    phase: 'Fuerza-Hipertrofia', reps: '5-8 reps', phaseNum: 2,
    workouts: [
      wt('Upper A · Fuerza-Hipertrofia', 'Upper A', 'Press · Jalones', 0),
      wt('Upper B · Fuerza-Hipertrofia', 'Upper B', 'Hombros · Bíceps', 1),
      wt('Lower A · Fuerza-Hipertrofia', 'Lower A', 'Sentadilla · Prensa', 2),
      wt('Lower B · Fuerza-Hipertrofia', 'Lower B', 'Peso Muerto · Glúteos', 3),
      wt('Metabólico · Fuerza-Hipertrofia', 'Metabólico', 'Circuito compuesto', 4),
      wt('Cardio', 'Cardio', 'Resistencia', 5),
    ],
  };

  // Fase 3: Jul–Sep  — Volumen Alto (12-15)
  if (month <= 9) return {
    phase: 'Volumen Alto', reps: '12-15 reps', phaseNum: 3,
    workouts: [
      wt('Upper A · Volumen', 'Upper A', 'Pecho · Espalda', 0),
      wt('Upper B · Volumen', 'Upper B', 'Hombros · Brazos', 1),
      wt('Lower A · Volumen', 'Lower A', 'Cuádriceps · Pantorrillas', 2),
      wt('Lower B · Volumen', 'Lower B', 'Isquios · Glúteos', 3),
      wt('HIIT · Volumen', 'HIIT', 'Alta intensidad', 4),
      wt('Cardio', 'Cardio', 'Resistencia', 5),
    ],
  };

  // Fase 4: Oct–Dic  — Fuerza Máxima + Deload (3-6)
  return {
    phase: 'Fuerza Máxima', reps: '3-6 reps', phaseNum: 4,
    workouts: [
      wt('Upper A · Fuerza Máxima', 'Upper A', 'Press · Row pesado', 0),
      wt('Upper B · Fuerza Máxima', 'Upper B', 'Hombros · Jalones', 1),
      wt('Lower A · Fuerza Máxima', 'Lower A', 'Sentadilla pesada', 2),
      wt('Lower B · Fuerza Máxima', 'Lower B', 'Peso Muerto pesado', 3),
      wt('Deload · Fuerza Máxima', 'Deload', 'Descarga programada', 4),
      wt('Cardio', 'Cardio', 'Resistencia', 5),
    ],
  };
}

const PHASE_COLORS: Record<number, string> = {
  1: 'text-green-400 bg-green-400/10 border-green-400/20',
  2: 'text-[#DC143C] bg-[#DC143C]/10 border-[#DC143C]/20',
  3: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  4: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
};

/* ─── Duraciones ─────────────────────────────────────────────────────── */
const DURATIONS = [30, 45, 60, 75, 90, 120];

/* ─── Props ──────────────────────────────────────────────────────────── */
interface QuickLogModalProps {
  open: boolean;
  onClose: () => void;
  onXP?: (xp: number) => void;
}

/* ─── Component ──────────────────────────────────────────────────────── */
export default function QuickLogModal({ open, onClose, onXP }: QuickLogModalProps) {
  const qc = useQueryClient();
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutOption | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const currentMonth = new Date().getMonth() + 1; // 1-12
  const plan = getMonthPlan(currentMonth);

  const mutation = useMutation({
    mutationFn: (data: object) => gymApi.createSession(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['gym-sessions'] });
      qc.invalidateQueries({ queryKey: ['rpg-character'] });
      qc.invalidateQueries({ queryKey: ['rpg-combo'] });
      const xp = res.data?.xpAwarded ?? res.data?.xp ?? 50;
      onXP?.(xp);
      toast.success('¡Sesión registrada!');
      handleClose();
    },
    onError: () => toast.error('Error al registrar la sesión'),
  });

  function handleClose() {
    setSelectedWorkout(null);
    setDuration(null);
    onClose();
  }

  function handleSubmit() {
    if (!selectedWorkout || !duration) return;
    mutation.mutate({ name: selectedWorkout.name, duration });
  }

  const ready = selectedWorkout !== null && duration !== null;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-5 max-h-[90dvh] overflow-y-auto">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#DC143C]" />
                  <Dialog.Title className="text-lg font-bold text-white">Registro rápido</Dialog.Title>
                </div>
                <Dialog.Close asChild>
                  <button className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </Dialog.Close>
              </div>

              {/* Phase badge */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold w-fit ${PHASE_COLORS[plan.phaseNum]}`}>
                <Calendar className="w-3.5 h-3.5" />
                Fase {plan.phaseNum} · {plan.phase} · {plan.reps}
              </div>

              {/* Workout type */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Rutina</p>
                <div className="grid grid-cols-3 gap-2">
                  {plan.workouts.map((wt) => (
                    <motion.button
                      key={wt.name}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedWorkout(wt)}
                      className={`py-2.5 px-1 rounded-xl border text-center transition-all ${
                        selectedWorkout?.name === wt.name ? wt.active : wt.color
                      }`}
                    >
                      <div className="text-sm font-bold leading-tight">{wt.label}</div>
                      <div className="text-[10px] opacity-60 mt-0.5 leading-tight">{wt.sub}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Duración</p>
                <div className="grid grid-cols-3 gap-2">
                  {DURATIONS.map((d) => (
                    <motion.button
                      key={d}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setDuration(d)}
                      className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                        duration === d
                          ? 'border-[#DC143C] bg-[#DC143C]/20 text-white'
                          : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      {d < 60 ? `${d}m` : `${d / 60}h`}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <motion.button
                whileHover={ready ? { scale: 1.02 } : {}}
                whileTap={ready ? { scale: 0.98 } : {}}
                onClick={handleSubmit}
                disabled={!ready || mutation.isPending}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
                  ready
                    ? 'bg-[#DC143C] text-white'
                    : 'bg-white/5 text-gray-600 cursor-not-allowed'
                }`}
                style={ready ? { boxShadow: '0 0 20px rgba(220,20,60,0.3)' } : {}}
              >
                {mutation.isPending ? 'Guardando...' : 'Guardar sesión'}
              </motion.button>

            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
