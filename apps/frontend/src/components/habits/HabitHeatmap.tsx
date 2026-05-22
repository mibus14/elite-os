'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { format, subDays, startOfWeek, addDays, parseISO } from 'date-fns';
import type { HeatmapData } from '@/types';

interface HabitHeatmapProps {
  data: HeatmapData[];
  color?: string;
  title?: string;
}

export default function HabitHeatmap({
  data,
  color = '#DC143C',
  title = 'Habit History',
}: HabitHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  const dataMap = new Map(data.map((d) => [d.date, d.count]));
  const today = new Date();
  const weeks: Date[][] = [];
  const startDate = subDays(today, 364);
  const weekStart = startOfWeek(startDate, { weekStartsOn: 0 });

  for (let w = 0; w < 53; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(addDays(weekStart, w * 7 + d));
    }
    weeks.push(week);
  }

  const getAlpha = (count: number) => {
    if (count === 0) return 0.05;
    return 0.3 + count * 0.35;
  };

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">{title}</h3>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 720 }}>
          <div className="flex gap-[3px]">
            <div className="flex flex-col gap-[3px] mr-1">
              {['', 'M', '', 'W', '', 'F', ''].map((label, i) => (
                <div key={i} className="w-4 h-3 text-xs text-gray-600 flex items-center justify-center">
                  {label}
                </div>
              ))}
            </div>

            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-[3px]">
                {week.map((day, dIdx) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const count = dataMap.get(dateStr) || 0;
                  const isFuture = day > today;
                  const alpha = getAlpha(count);

                  return (
                    <motion.div
                      key={dIdx}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: isFuture ? 0.1 : 1, scale: 1 }}
                      transition={{ delay: (wIdx * 7 + dIdx) * 0.001 }}
                      className="w-3 h-3 rounded-sm cursor-pointer hover:ring-1 hover:ring-white/30 transition-all"
                      style={{ background: count > 0 ? `${color}` : '#1a1a1a', opacity: isFuture ? 0.1 : alpha || 1 }}
                      onMouseEnter={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setTooltip({ date: dateStr, count, x: rect.left, y: rect.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onTouchStart={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setTooltip({ date: dateStr, count, x: rect.left, y: rect.top });
                      }}
                      onTouchEnd={() => setTimeout(() => setTooltip(null), 1200)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {tooltip && typeof document !== 'undefined' && createPortal(
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed pointer-events-none bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl"
          style={{ left: tooltip.x, top: tooltip.y - 44, zIndex: 99999 }}
        >
          <div className="font-semibold text-white">{format(parseISO(tooltip.date), 'MMMM d, yyyy')}</div>
          <div className="text-gray-400">{tooltip.count > 0 ? 'Completed' : 'Not completed'}</div>
        </motion.div>,
        document.body
      )}
    </div>
  );
}
