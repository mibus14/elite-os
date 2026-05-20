'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus } from 'lucide-react';
import { habitsApi } from '@/lib/api';
import toast from 'react-hot-toast';

const ICONS = ['🏋️', '🏃', '📚', '🧘', '💧', '🥗', '😴', '💪', '🎯', '🧠', '✍️', '🎨', '🎸', '🚴', '🏊', '⚡', '🌅', '🌿', '🔥', '💎', '🦁', '🚀', '⭐', '🎵'];
const COLORS = ['#DC143C', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#F97316', '#6366F1'];

interface CreateHabitModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateHabitModal({ open, onClose }: CreateHabitModalProps) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🏋️');
  const [color, setColor] = useState('#DC143C');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [xpReward, setXpReward] = useState(30);

  const mutation = useMutation({
    mutationFn: (data: object) => habitsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] });
      toast.success('Habit created!');
      onClose();
      resetForm();
    },
    onError: () => toast.error('Failed to create habit'),
  });

  function resetForm() {
    setName('');
    setDescription('');
    setIcon('🏋️');
    setColor('#DC143C');
    setFrequency('daily');
    setXpReward(30);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name is required');
    mutation.mutate({ name, description, icon, color, frequency, xpReward });
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
            <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="p-6 border-b border-[#1A1A1A] flex items-center justify-between">
                <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#DC143C]" />
                  New Habit
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Preview */}
                <motion.div
                  className="rounded-xl p-4 border text-center"
                  style={{ borderColor: `${color}50`, background: `${color}10` }}
                >
                  <div className="text-4xl mb-2">{icon}</div>
                  <div className="text-white font-semibold">{name || 'Habit name'}</div>
                  <div className="text-xs mt-1" style={{ color }}>+{xpReward} XP · {frequency}</div>
                </motion.div>

                <div>
                  <label className="label-sm">Habit Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Morning Run, Read 30min..."
                    className="input-field mt-1.5"
                  />
                </div>

                <div>
                  <label className="label-sm">Description (optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Why does this habit matter?"
                    rows={2}
                    className="input-field mt-1.5 resize-none"
                  />
                </div>

                {/* Icon picker */}
                <div>
                  <label className="label-sm">Icon</label>
                  <div className="grid grid-cols-8 gap-2 mt-2">
                    {ICONS.map((em) => (
                      <motion.button
                        key={em}
                        type="button"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIcon(em)}
                        className={`text-xl p-2 rounded-lg transition-all ${icon === em ? 'bg-white/20 ring-2 ring-white/30' : 'bg-white/5 hover:bg-white/10'}`}
                      >
                        {em}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Color picker */}
                <div>
                  <label className="label-sm">Color</label>
                  <div className="flex gap-2 mt-2">
                    {COLORS.map((c) => (
                      <motion.button
                        key={c}
                        type="button"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Frequency + XP */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-sm">Frequency</label>
                    <div className="flex gap-2 mt-2">
                      {(['daily', 'weekly'] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFrequency(f)}
                          className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all border ${frequency === f ? 'bg-[#DC143C] border-[#DC143C] text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label-sm">XP Reward</label>
                    <input
                      type="number"
                      value={xpReward}
                      onChange={(e) => setXpReward(parseInt(e.target.value) || 0)}
                      min={5}
                      max={200}
                      step={5}
                      className="input-field mt-1.5"
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={mutation.isPending}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl bg-[#DC143C] hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-50"
                  style={{ boxShadow: '0 0 20px rgba(220,20,60,0.3)' }}
                >
                  {mutation.isPending ? 'Creating...' : 'Create Habit'}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
