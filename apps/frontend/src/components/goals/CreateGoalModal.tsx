'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Target, Dumbbell, BookOpen, DollarSign, User } from 'lucide-react';
import { goalsApi } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface CreateGoalModalProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { value: 'fitness', label: 'Fitness', icon: Dumbbell, color: '#DC143C' },
  { value: 'learning', label: 'Learning', icon: BookOpen, color: '#3B82F6' },
  { value: 'finance', label: 'Finance', icon: DollarSign, color: '#22C55E' },
  { value: 'personal', label: 'Personal', icon: User, color: '#8B5CF6' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-gray-400 border-gray-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400 border-yellow-600' },
  { value: 'high', label: 'High', color: 'text-orange-400 border-orange-600' },
  { value: 'critical', label: 'Critical', color: 'text-red-400 border-red-600' },
];

export default function CreateGoalModal({ open, onClose }: CreateGoalModalProps) {
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'fitness' | 'learning' | 'finance' | 'personal'>('fitness');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('0');
  const [unit, setUnit] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  const mutation = useMutation({
    mutationFn: (data: object) => goalsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal created!');
      onClose();
      resetForm();
    },
    onError: () => toast.error('Failed to create goal'),
  });

  function resetForm() {
    setTitle('');
    setDescription('');
    setCategory('fitness');
    setTargetValue('');
    setCurrentValue('0');
    setUnit('');
    setDeadline('');
    setPriority('medium');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error('Title is required');
    if (!targetValue) return toast.error('Target value is required');
    if (!deadline) return toast.error('Deadline is required');

    mutation.mutate({
      title,
      description,
      category,
      targetValue: parseFloat(targetValue),
      currentValue: parseFloat(currentValue) || 0,
      unit,
      deadline,
      priority,
    });
  }

  const selectedCategory = CATEGORIES.find((c) => c.value === category);

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
            <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-[#111111] border-b border-[#1A1A1A] p-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-[#DC143C]" />
                  <Dialog.Title className="text-xl font-bold text-white">New Goal</Dialog.Title>
                </div>
                <Dialog.Close asChild>
                  <button className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Category */}
                <div>
                  <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2 block">
                    Category
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map(({ value, label, icon: Icon, color }) => (
                      <motion.button
                        key={value}
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setCategory(value as typeof category)}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all ${
                          category === value
                            ? 'text-white border-opacity-50'
                            : 'text-gray-500 border-white/10 hover:border-white/20'
                        }`}
                        style={
                          category === value
                            ? { borderColor: color, background: `${color}15`, color }
                            : {}
                        }
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Goal Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Be specific and measurable..."
                />

                <div>
                  <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5 block">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Why does this goal matter? How will you achieve it?"
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#DC143C]/50 transition-all resize-none text-sm"
                  />
                </div>

                {/* Target / Current / Unit */}
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Target"
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="100"
                  />
                  <Input
                    label="Current"
                    type="number"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    placeholder="0"
                  />
                  <Input
                    label="Unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="kg, books..."
                  />
                </div>

                {/* Deadline */}
                <Input
                  label="Deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />

                {/* Priority */}
                <div>
                  <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2 block">
                    Priority
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {PRIORITIES.map(({ value, label, color }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPriority(value as typeof priority)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                          priority === value
                            ? `bg-white/10 ${color}`
                            : 'bg-white/3 text-gray-600 border-white/5 hover:border-white/15'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={mutation.isPending}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-50"
                  style={{
                    background: selectedCategory?.color || '#DC143C',
                    boxShadow: `0 0 20px ${selectedCategory?.color || '#DC143C'}40`,
                  }}
                >
                  {mutation.isPending ? 'Creating...' : 'Create Goal'}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
