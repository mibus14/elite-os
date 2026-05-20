'use client';

import { motion } from 'framer-motion';
import { Dumbbell, BookOpen, DollarSign, User, Clock, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CircleProgress } from '@/components/ui/Progress';
import type { Goal } from '@/types';

interface GoalCardProps {
  goal: Goal;
  onUpdateProgress?: (goal: Goal) => void;
  delay?: number;
}

const categoryConfig = {
  fitness: { icon: Dumbbell, color: '#DC143C', bg: 'bg-[#DC143C]/10', border: 'border-[#DC143C]/20' },
  learning: { icon: BookOpen, color: '#3B82F6', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  finance: { icon: DollarSign, color: '#22C55E', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  personal: { icon: User, color: '#8B5CF6', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
};

const priorityConfig = {
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function getDeadlineColor(deadline: string, completed: boolean): string {
  if (completed) return 'text-green-400';
  const now = new Date();
  const dl = new Date(deadline);
  const daysLeft = (dl.getTime() - now.getTime()) / 86400000;
  if (daysLeft < 0) return 'text-red-500';
  if (daysLeft <= 14) return 'text-red-400';
  if (daysLeft <= 30) return 'text-yellow-400';
  return 'text-green-400';
}

export default function GoalCard({ goal, onUpdateProgress, delay = 0 }: GoalCardProps) {
  const config = categoryConfig[goal.category];
  const Icon = config.icon;
  const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
  const deadlineColor = getDeadlineColor(goal.deadline, goal.completed);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
      whileHover={{ scale: 1.02, boxShadow: `0 0 20px ${config.color}20` }}
      className={`rounded-2xl bg-white/5 backdrop-blur border ${config.border} p-5 flex flex-col gap-4`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${config.bg}`}>
            <Icon className="w-4 h-4" style={{ color: config.color }} />
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${priorityConfig[goal.priority]}`}>
            {goal.priority.toUpperCase()}
          </span>
        </div>
        {goal.completed && (
          <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5 font-bold">
            DONE
          </span>
        )}
      </div>

      {/* Title */}
      <div>
        <h3 className="text-white font-bold text-base leading-snug">{goal.title}</h3>
        {goal.description && (
          <p className="text-gray-500 text-xs mt-1 line-clamp-2">{goal.description}</p>
        )}
      </div>

      {/* Circular progress */}
      <div className="flex items-center gap-4">
        <CircleProgress
          value={goal.currentValue}
          max={goal.targetValue}
          size={72}
          strokeWidth={5}
          color={config.color}
          label={
            <div className="text-center">
              <div className="text-sm font-bold text-white">{Math.round(progress)}%</div>
            </div>
          }
        />
        <div className="flex-1">
          <div className="text-2xl font-bold text-white">
            {goal.currentValue}
            <span className="text-sm text-gray-500 ml-1">{goal.unit}</span>
          </div>
          <div className="text-xs text-gray-500">
            of {goal.targetValue} {goal.unit} goal
          </div>
          <div className={`text-xs mt-1.5 flex items-center gap-1 ${deadlineColor}`}>
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(goal.deadline), { addSuffix: true })}
          </div>
        </div>
      </div>

      {/* Update button */}
      {!goal.completed && onUpdateProgress && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onUpdateProgress(goal)}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-sm font-semibold transition-all border"
          style={{
            background: `${config.color}15`,
            borderColor: `${config.color}30`,
            color: config.color,
          }}
        >
          Update Progress
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      )}
    </motion.div>
  );
}
