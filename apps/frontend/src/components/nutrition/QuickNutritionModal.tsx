'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Utensils, Flame, Loader2, Pencil } from 'lucide-react';
import { nutritionApi } from '@/lib/api';
import toast from 'react-hot-toast';

type Category = 'BAD' | 'HOMEMADE_CAL' | 'HEALTHY';
type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const CATEGORIES: { id: Category; label: string; sub: string; color: string; active: string }[] = [
  { id: 'BAD',          label: 'Comida Mala',    sub: 'Rápida, procesada',   color: 'border-red-500/40 bg-red-500/8 text-red-300',    active: 'border-red-400 bg-red-500/25 text-red-100' },
  { id: 'HOMEMADE_CAL', label: 'Casera Calórica', sub: 'Hecha en casa, densa', color: 'border-yellow-500/40 bg-yellow-500/8 text-yellow-300', active: 'border-yellow-400 bg-yellow-500/25 text-yellow-100' },
  { id: 'HEALTHY',      label: 'Comer Bien',      sub: 'Balanceada, limpia',  color: 'border-green-500/40 bg-green-500/8 text-green-300', active: 'border-green-400 bg-green-500/25 text-green-100' },
];

const MEAL_TIMES: { id: MealTime; label: string }[] = [
  { id: 'breakfast', label: 'Desayuno' },
  { id: 'lunch',     label: 'Comida' },
  { id: 'dinner',    label: 'Cena' },
  { id: 'snack',     label: 'Snack' },
];

interface Props { open: boolean; onClose: () => void }

export default function QuickNutritionModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [description,   setDescription]   = useState('');
  const [category,      setCategory]      = useState<Category | null>(null);
  const [mealTime,      setMealTime]      = useState<MealTime | null>(null);
  const [aiCalories,    setAiCalories]    = useState<number | null>(null);
  const [manualCalories, setManualCalories] = useState<string>('');
  const [unknown,       setUnknown]       = useState(false);
  const [estimating,    setEstimating]    = useState(false);
  const [editingCal,    setEditingCal]    = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Effective calories: manual input overrides AI estimate
  const effectiveCalories = (() => {
    if (editingCal || unknown) {
      const n = parseInt(manualCalories)
      return Number.isNaN(n) ? null : n
    }
    return aiCalories
  })()

  // Debounce AI estimate
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (description.trim().length < 3) {
      setAiCalories(null); setUnknown(false); setEstimating(false); return;
    }
    setEstimating(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await nutritionApi.estimate(description.trim());
        const cal = res.data.calories;
        const isUnknown = res.data.unknown === true || cal === null;
        setAiCalories(isUnknown ? null : cal);
        setUnknown(isUnknown);
        if (!isUnknown && !editingCal) setManualCalories(String(cal));
      } catch {
        setAiCalories(null); setUnknown(false);
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
      qc.invalidateQueries({ queryKey: ['rpg-combo'] });
      toast.success('¡Comida registrada!');
      handleClose();
    },
    onError: () => toast.error('Error al registrar'),
  });

  function handleClose() {
    setDescription(''); setCategory(null); setMealTime(null);
    setAiCalories(null); setManualCalories(''); setUnknown(false); setEditingCal(false);
    onClose();
  }

  function handleSubmit() {
    if (!description.trim() || !category || !mealTime) return;
    const cal = effectiveCalories ?? 0;
    saveMutation.mutate({ name: description.trim(), mealType: mealTime, category, calories: cal });
  }

  // Ready: just need description + category + mealTime (calories can be 0)
  const ready = description.trim().length >= 3 && category !== null && mealTime !== null && !estimating;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
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
                  <Utensils className="w-5 h-5 text-elite-600" />
                  <Dialog.Title className="text-lg font-bold text-white">Registrar comida</Dialog.Title>
                </div>
                <Dialog.Close asChild>
                  <button className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </Dialog.Close>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">¿Qué comiste?</p>
                <div className="relative">
                  <input
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); setEditingCal(false); }}
                    placeholder="ej. 2 tacos de bistec, sopa de fideo..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-28 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-elite-600/50 transition-all"
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {estimating ? (
                      <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                    ) : aiCalories !== null && !editingCal ? (
                      <button
                        onClick={() => { setEditingCal(true); setManualCalories(String(aiCalories)); }}
                        className="flex items-center gap-1 text-xs font-bold text-orange-300 bg-orange-400/10 border border-orange-400/20 rounded-full px-2 py-0.5 hover:bg-orange-400/20 transition-colors"
                      >
                        <Flame className="w-3 h-3" />
                        ~{aiCalories} kcal
                        <Pencil className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Campo manual de calorías — aparece cuando IA no reconoce o usuario quiere editar */}
              {(unknown || editingCal) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1.5"
                >
                  <p className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                    {unknown ? (
                      <><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> IA no reconoció este alimento — ingresa las calorías manualmente</>
                    ) : (
                      <><Pencil className="w-3 h-3" /> Editar calorías</>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={9999}
                      value={manualCalories}
                      onChange={(e) => setManualCalories(e.target.value)}
                      placeholder="ej. 350"
                      className="flex-1 bg-white/5 border border-yellow-400/30 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/60 transition-all"
                      autoFocus
                    />
                    <span className="text-xs text-gray-500 flex-shrink-0">kcal</span>
                    {editingCal && !unknown && (
                      <button onClick={() => { setEditingCal(false); setManualCalories(''); }} className="text-xs text-gray-600 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5">
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-600">Puedes poner 0 si no lo sabes — igual se guarda</p>
                </motion.div>
              )}

              {/* Categoría */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Tipo</p>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <motion.button key={cat.id} whileTap={{ scale: 0.95 }} onClick={() => setCategory(cat.id)}
                      className={`py-2.5 px-1 rounded-xl border text-center transition-all ${category === cat.id ? cat.active : cat.color}`}>
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
                    <motion.button key={mt.id} whileTap={{ scale: 0.95 }} onClick={() => setMealTime(mt.id)}
                      className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        mealTime === mt.id ? 'border-elite-600 bg-elite-600/20 text-white' : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                      }`}>
                      {mt.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Resumen de calorías */}
              {effectiveCalories !== null && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xs text-gray-500">Calorías a registrar</span>
                  <span className="text-sm font-bold text-white flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    {effectiveCalories} kcal
                  </span>
                </div>
              )}

              {/* Submit */}
              <motion.button
                whileHover={ready ? { scale: 1.02 } : {}}
                whileTap={ready ? { scale: 0.98 } : {}}
                onClick={handleSubmit}
                disabled={!ready || saveMutation.isPending}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
                  ready ? 'bg-elite-600 text-white' : 'bg-white/5 text-gray-600 cursor-not-allowed'
                }`}
                style={ready ? { boxShadow: '0 0 20px rgba(var(--accent-rgb),0.3)' } : {}}
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
