'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2, Dumbbell } from 'lucide-react';
import { gymApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface SetEntry {
  weight: number;
  reps: number;
}

interface ExerciseEntry {
  exerciseName: string;
  muscleGroups: string[];
  sets: SetEntry[];
}

interface LogSessionModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with XP awarded after a session is successfully logged */
  onXP?: (xp: number) => void;
}

export default function LogSessionModal({ open, onClose, onXP }: LogSessionModalProps) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('');
  const [exercises, setExercises] = useState<ExerciseEntry[]>([
    { exerciseName: '', muscleGroups: [], sets: [{ weight: 0, reps: 0 }] },
  ]);

  const mutation = useMutation({
    mutationFn: (data: object) => gymApi.createSession(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['gym-sessions'] });
      qc.invalidateQueries({ queryKey: ['rpg-character'] });
      qc.invalidateQueries({ queryKey: ['rpg-combo'] });
      const xp = res.data?.xpAwarded ?? res.data?.xp ?? 50;
      onXP?.(xp);
      toast.success('¡Sesión registrada!');
      onClose();
      resetForm();
    },
    onError: () => toast.error('Error al registrar la sesión'),
  });

  function resetForm() {
    setName('');
    setDate(new Date().toISOString().split('T')[0]);
    setDuration('');
    setExercises([{ exerciseName: '', muscleGroups: [], sets: [{ weight: 0, reps: 0 }] }]);
  }

  function addExercise() {
    setExercises((prev) => [
      ...prev,
      { exerciseName: '', muscleGroups: [], sets: [{ weight: 0, reps: 0 }] },
    ]);
  }

  function removeExercise(idx: number) {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateExercise(idx: number, field: keyof ExerciseEntry, value: unknown) {
    setExercises((prev) => prev.map((ex, i) => (i === idx ? { ...ex, [field]: value } : ex)));
  }

  function addSet(exIdx: number) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx ? { ...ex, sets: [...ex.sets, { weight: 0, reps: 0 }] } : ex
      )
    );
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx ? { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) } : ex
      )
    );
  }

  function updateSet(exIdx: number, setIdx: number, field: keyof SetEntry, value: number) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? {
              ...ex,
              sets: ex.sets.map((s, si) => (si === setIdx ? { ...s, [field]: value } : s)),
            }
          : ex
      )
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Session name is required');
    mutation.mutate({
      name,
      date,
      duration: parseInt(duration) || 0,
      exercises: exercises.map((ex) => ({
        exerciseName: ex.exerciseName,
        muscleGroups: ex.muscleGroups,
        sets: ex.sets.map((s) => ({ ...s, completed: true })),
      })),
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
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
            <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl w-full max-w-2xl max-h-[90dvh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-[#111111] border-b border-[#1A1A1A] p-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <Dumbbell className="w-5 h-5 text-[#DC143C]" />
                  <Dialog.Title className="text-xl font-bold text-white">Log Session</Dialog.Title>
                </div>
                <Dialog.Close asChild>
                  <button className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Session info */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5 block">
                      Session Name
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Push Day, Legs, Full Body..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#DC143C]/50 focus:bg-white/8 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5 block">
                      Duration (min)
                    </label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="60"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#DC143C]/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5 block">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#DC143C]/50 transition-all"
                  />
                </div>

                {/* Exercises */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-300">Exercises</h3>
                    <button
                      type="button"
                      onClick={addExercise}
                      className="flex items-center gap-1.5 text-xs text-[#DC143C] hover:text-red-400 font-semibold transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Exercise
                    </button>
                  </div>

                  <AnimatePresence>
                    {exercises.map((ex, exIdx) => (
                      <motion.div
                        key={exIdx}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            value={ex.exerciseName}
                            onChange={(e) => updateExercise(exIdx, 'exerciseName', e.target.value)}
                            placeholder="Exercise name..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#DC143C]/50 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => removeExercise(exIdx)}
                            className="p-2 text-gray-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Sets */}
                        <div className="space-y-2">
                          <div className="grid grid-cols-12 gap-2 text-xs text-gray-600 px-1">
                            <span className="col-span-1">Set</span>
                            <span className="col-span-5">Weight (kg)</span>
                            <span className="col-span-5">Reps</span>
                          </div>
                          {ex.sets.map((set, setIdx) => (
                            <div key={setIdx} className="grid grid-cols-12 gap-2 items-center">
                              <span className="col-span-1 text-xs text-gray-600 text-center">
                                {setIdx + 1}
                              </span>
                              <input
                                type="number"
                                value={set.weight || ''}
                                onChange={(e) => updateSet(exIdx, setIdx, 'weight', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="col-span-5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm text-center focus:outline-none focus:border-[#DC143C]/50 transition-all"
                              />
                              <input
                                type="number"
                                value={set.reps || ''}
                                onChange={(e) => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="col-span-5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm text-center focus:outline-none focus:border-[#DC143C]/50 transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => removeSet(exIdx, setIdx)}
                                className="col-span-1 text-gray-700 hover:text-red-400 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => addSet(exIdx)}
                          className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Set
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={mutation.isPending}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl bg-[#DC143C] hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ boxShadow: '0 0 20px rgba(220,20,60,0.3)' }}
                >
                  {mutation.isPending ? 'Logging...' : 'Log Session'}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
