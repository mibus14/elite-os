'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Utensils, Flame, Loader2 } from 'lucide-react';
import { nutritionApi } from '@/lib/api';
import toast from 'react-hot-toast';

/* ─── Tipos ──────────────────────────────────────────────────────── */
type Category = 'BAD' | 'HOMEMADE_CAL' | 'HEALTHY';
type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const CATEGORIES: { id: Category; label: string; sub: string; color: string; active: string }[] = [
  {
    id: 'BAD',
    label: 'Comida Mala',
    sub: 'Rápida, procesada',
    color: 'border-red-500/40 bg-red-500/8 text-red-300',
    active: 'border-red-400 bg-red-500/25 text-red-100',
  },
  {
    id: 'HOMEMADE_CAL',
    label: 'Casera Calórica',
    sub: 'Hecha en casa, densa',
    color: 'border-yellow-500/40 bg-yellow-500/8 text-yellow-300',
    active: 'border-yellow-400 bg-yellow-500/25 text-yellow-100',
  },
  {
    id: 'HEALTHY',
    label: 'Comer Bien',
    sub: 'Balanceada, limpia',
    color: 'border-green-500/40 bg-green-500/8 text-green-300',
    active: 'border-green-400 bg-green-500/25 text-green-100',
  },
];

const MEAL_TIMES: { id: MealTime; label: string }[] = [
  { id: 'breakfast', label: 'Desayuno' },
  { id: 'lunch',     label: 'Comida' },
  { id: 'dinner',    label: 'Cena' },
  { id: 'snack',     label: 'Snack' },
];

/* ─── Props ──────────────────────────────────────────────────────── */
interface QuickNutritionModalProps {
  open: boolean;
  onClose: () => void;
}

/* ─── Component ──────────────────────────────────────────────────── */
export default function QuickNutritionModal({ open, onClose }: QuickNutritionModalProps) {
  const qc = useQueryClient();
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [mealTime, setMealTime] = useState<MealTime | null>(null);
  const [estimated, setEstimated] = useState<number | null>(null);
  const [unknown, setUnknown] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce estimación calórica
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (description.trim().length < 3) {
      setEstimated(null);
      setUnknown(false);
      return;
    }
    setEstimating(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await nutritionApi.estimate(description.trim());
        setEstimated(res.data.calories);
        setUnknown(res.data.unknown === true);
      } catch {
        setEstimated(null);
        setUnknown(false);
      } finally {
        setEstimating(false);
      }
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [description]);

  const saveMutation = useMutation({
    mutationFn: (data: object) => nutritionApi.addMeal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nutrition', 'today'] });
      qc.invalidateQueries({ queryKey: ['rpg-character'] });
      toast.success('¡Comida registrada!');
      handleClose();
    },
    onError: () => toast.error('Error al registrar'),
  });

  function handleClose() {
    setDescription('');
    setCategory(null);
    setMealTime(null);
    setEstimated(null);
    setUnknown(false);
    onClose();
  }

  function handleSubmit() {
    if (!description.trim() || !category || !mealTime || unknown) return;
    saveMutation.mutate({
      name: description.trim(),
      mealType: mealTime,
      category,
      calories: estimated ?? 0,
    });
  }

  const ready = description.trim().length >= 3 && category !== null && mealTime !== null && estimated !== null && !unknown;

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
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pb-safe"
          >
            <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-5 max-h-[90dvh] overflow-y-auto">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-[#DC143C]" />
                  <Dialog.Title className="text-lg font-bold text-white">Registrar comida</Dialog.Title>
                </div>
                <Dialog.Close asChild>
                  <button className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </Dialog.Close>
              </div>

              {/* Input descripción */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">¿Qué comiste?</p>
                <div className="relative">
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="ej. sopa de fideo 500ml, 2 tacos de bistec..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-24 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#DC143C]/50 transition-all"
                    autoFocus
                  />
                  {/* Chip de calorías estimadas */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {estimating ? (
                      <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                    ) : unknown ? (
                      <span className="text-xs font-bold text-gray-500 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
                        No reconocido
                      </span>
                    ) : estimated !== null ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-orange-300 bg-orange-400/10 border border-orange-400/20 rounded-full px-2 py-0.5">
                        <Flame className="w-3 h-3" />
                        ~{estimated} kcal
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Categoría */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Tipo</p>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <motion.button
                      key={cat.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCategory(cat.id)}
                      className={`py-2.5 px-1 rounded-xl border text-center transition-all ${
                        category === cat.id ? cat.active : cat.color
                      }`}
                    >
                      <div className="text-xs font-bold leading-tight">{cat.label}</div>
                      <div className="text-[10px] opacity-60 mt-0.5 leading-tight">{cat.sub}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Momento del día */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Momento</p>
                <div className="grid grid-cols-4 gap-2">
                  {MEAL_TIMES.map((mt) => (
                    <motion.button
                      key={mt.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setMealTime(mt.id)}
                      className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        mealTime === mt.id
                          ? 'border-[#DC143C] bg-[#DC143C]/20 text-white'
                          : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      {mt.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <motion.button
                whileHover={ready ? { scale: 1.02 } : {}}
                whileTap={ready ? { scale: 0.98 } : {}}
                onClick={handleSubmit}
                disabled={!ready || saveMutation.isPending}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
                  ready
                    ? 'bg-[#DC143C] text-white'
                    : 'bg-white/5 text-gray-600 cursor-not-allowed'
                }`}
                style={ready ? { boxShadow: '0 0 20px rgba(220,20,60,0.3)' } : {}}
              >
                {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
              </motion.button>

            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
