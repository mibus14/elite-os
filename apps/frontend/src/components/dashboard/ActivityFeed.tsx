'use client';

import { motion } from 'framer-motion';
import { Dumbbell, Apple, Activity, CheckCircle, Target } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ActivityItem } from '@/types';

interface ActivityFeedProps {
  activities: ActivityItem[];
}

const activityConfig = {
  gym: { icon: Dumbbell, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  nutrition: { icon: Apple, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
  cardio: { icon: Activity, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  habit: { icon: CheckCircle, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
  goal: { icon: Target, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
};

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6"
    >
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-5">
        Recent Activity
      </h3>

      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
        {activities.slice(0, 10).map((item, idx) => {
          const config = activityConfig[item.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`flex items-start gap-3 p-3 rounded-xl border ${config.border} ${config.bg} hover:bg-white/5 transition-colors`}
            >
              <div className={`p-2 rounded-lg bg-black/30 shrink-0`}>
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm leading-snug">{item.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-500 text-xs">
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </span>
                  {item.xpGained && (
                    <span className="text-yellow-400 text-xs font-bold">+{item.xpGained} XP</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {activities.length === 0 && (
          <div className="text-center py-8 text-gray-600">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
