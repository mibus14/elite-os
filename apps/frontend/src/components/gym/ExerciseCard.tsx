'use client';

import { motion } from 'framer-motion';
import { Dumbbell, Calendar, Trophy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Exercise } from '@/types';

interface ExerciseCardProps {
  exercise: Exercise;
  delay?: number;
}

const muscleColors: Record<string, string> = {
  chest: 'bg-red-900/50 text-red-300 border-red-800',
  back: 'bg-blue-900/50 text-blue-300 border-blue-800',
  legs: 'bg-green-900/50 text-green-300 border-green-800',
  shoulders: 'bg-purple-900/50 text-purple-300 border-purple-800',
  arms: 'bg-orange-900/50 text-orange-300 border-orange-800',
  core: 'bg-yellow-900/50 text-yellow-300 border-yellow-800',
  default: 'bg-gray-800/50 text-gray-400 border-gray-700',
};

function getMuscleColor(muscle: string): string {
  const key = Object.keys(muscleColors).find((k) => muscle.toLowerCase().includes(k));
  return key ? muscleColors[key] : muscleColors.default;
}

export default function ExerciseCard({ exercise, delay = 0 }: ExerciseCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5 cursor-default"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-xl bg-[#DC143C]/10 border border-[#DC143C]/20">
          <Dumbbell className="w-5 h-5 text-[#DC143C]" />
        </div>
        {exercise.personalRecord && (
          <div className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-2 py-0.5">
            <Trophy className="w-3 h-3" />
            PR: {exercise.personalRecord}kg
          </div>
        )}
      </div>

      <h3 className="text-white font-semibold text-base mb-2">{exercise.name}</h3>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {exercise.muscleGroups.map((m) => (
          <span key={m} className={`text-xs px-2 py-0.5 rounded-full border ${getMuscleColor(m)}`}>
            {m}
          </span>
        ))}
      </div>

      <div className="space-y-1">
        {exercise.lastPerformed && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            {formatDistanceToNow(new Date(exercise.lastPerformed), { addSuffix: true })}
          </div>
        )}
        {exercise.lastWeight && (
          <div className="text-xs text-gray-400">
            Last: <span className="text-white font-semibold">{exercise.lastWeight}kg</span>
          </div>
        )}
      </div>

      {/* Sparkline of recent weights */}
      {exercise.recentWeights && exercise.recentWeights.length > 1 && (
        <div className="mt-3">
          <svg width="100%" height="28" className="overflow-visible">
            {(() => {
              const weights = exercise.recentWeights!;
              const min = Math.min(...weights);
              const max = Math.max(...weights);
              const range = max - min || 1;
              const points = weights.map((w, i) => ({
                x: (i / (weights.length - 1)) * 100,
                y: 24 - ((w - min) / range) * 20,
              }));
              const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}`).join(' ');
              return (
                <>
                  <polyline
                    points={points.map((p) => `${p.x}%,${p.y}`).join(' ')}
                    fill="none"
                    stroke="#DC143C"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {points.map((p, i) => (
                    <circle key={i} cx={`${p.x}%`} cy={p.y} r="2" fill="#DC143C" />
                  ))}
                </>
              );
            })()}
          </svg>
        </div>
      )}
    </motion.div>
  );
}
