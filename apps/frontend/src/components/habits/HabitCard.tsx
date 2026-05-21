'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, CheckCircle, Circle, Zap } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { habitsApi } from '@/lib/api';
import type { Habit } from '@/types';
import toast from 'react-hot-toast';

interface HabitCardProps {
  habit: Habit;
  delay?: number;
}

export default function HabitCard({ habit, delay = 0 }: HabitCardProps) {
  const qc = useQueryClient();
  const [justCompleted, setJustCompleted] = useState(false);

  const mutation = useMutation({
    mutationFn: () => habitsApi.log(habit.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] });
      setJustCompleted(true);
      toast.success(`+${habit.xpReward} XP earned!`, { icon: '⚡' });
      setTimeout(() => setJustCompleted(false), 1500);
    },
    onError: () => toast.error('Failed to log habit'),
  });

  const isCompleted = habit.completedToday || justCompleted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
      whileTap={{ scale: 0.98 }}
      className={`relative rounded-2xl border p-5 cursor-pointer transition-all overflow-hidden ${
        isCompleted
          ? 'border-opacity-50 bg-opacity-20'
          : 'border-white/10 bg-white/5'
      }`}
      style={{
        borderColor: isCompleted ? habit.color : undefined,
        background: isCompleted ? `${habit.color}15` : undefined,
        boxShadow: isCompleted ? `0 0 20px ${habit.color}30` : undefined,
      }}
      onClick={() => !isCompleted && !mutation.isPending && mutation.mutate()}
    >
      {/* Completion pulse */}
      <AnimatePresence>
        {justCompleted && (
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 rounded-2xl"
            style={{ background: habit.color, originX: '50%', originY: '50%' }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <motion.div
            animate={justCompleted ? { rotate: [0, -10, 10, -10, 0], scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.4 }}
            className="text-3xl"
          >
            {habit.icon}
          </motion.div>
          <motion.div
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              if (!isCompleted && !mutation.isPending) mutation.mutate();
            }}
          >
            {isCompleted ? (
              <CheckCircle className="w-6 h-6" style={{ color: habit.color }} />
            ) : (
              <Circle className="w-6 h-6 text-gray-600 hover:text-white transition-colors" />
            )}
          </motion.div>
        </div>

        <h3 className="text-white font-semibold text-base mb-1">{habit.name}</h3>
        {habit.description && (
          <p className="text-gray-500 text-xs mb-3 line-clamp-2">{habit.description}</p>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 font-bold text-sm">{habit.currentStreak}d</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-yellow-400/70">
            <Zap className="w-3 h-3" />
            <span>+{habit.xpReward} XP</span>
          </div>
        </div>

        {/* Completion rate bar */}
        <div className="mt-3">
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${habit.completionRate}%` }}
              transition={{ duration: 1, delay: delay + 0.3 }}
              className="h-full rounded-full"
              style={{ background: habit.color }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">{habit.completionRate}% this month</p>
        </div>
      </div>
    </motion.div>
  );
}
