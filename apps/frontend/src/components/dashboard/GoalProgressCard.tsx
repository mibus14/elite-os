'use client';

import { motion } from 'framer-motion';
import { Target, Dumbbell, BookOpen, DollarSign, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Goal } from '@/types';

interface GoalProgressCardProps {
  goals: Goal[];
}

const categoryConfig = {
  fitness: { icon: Dumbbell, color: 'text-red-400', bg: 'bg-red-400/10' },
  learning: { icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  finance: { icon: DollarSign, color: 'text-green-400', bg: 'bg-green-400/10' },
  personal: { icon: User, color: 'text-purple-400', bg: 'bg-purple-400/10' },
};

export default function GoalProgressCard({ goals }: GoalProgressCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <Target className="w-4 h-4 text-[#DC143C]" />
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
          Active Goals
        </h3>
      </div>

      <div className="space-y-5">
        {goals.slice(0, 3).map((goal, idx) => {
          const config = categoryConfig[goal.category as keyof typeof categoryConfig] ?? categoryConfig.personal;
          const Icon = config.icon;
          const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
          const daysLeft = formatDistanceToNow(new Date(goal.deadline), { addSuffix: true });

          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${config.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                  </div>
                  <span className="text-white text-sm font-medium truncate max-w-[180px]">
                    {goal.title}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{daysLeft}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, delay: idx * 0.1 + 0.3, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, #B91C1C, #DC143C, #FF003C)',
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400 min-w-[60px] text-right">
                  {goal.currentValue}/{goal.targetValue} {goal.unit}
                </span>
              </div>
            </motion.div>
          );
        })}

        {goals.length === 0 && (
          <div className="text-center py-6 text-gray-600">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active goals yet</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
