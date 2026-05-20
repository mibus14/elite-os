'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { format, subDays, startOfWeek, addDays, parseISO } from 'date-fns';
import type { HeatmapData } from '@/types';

interface ActivityHeatmapProps {
  data: HeatmapData[];
}

function getCellColor(count: number): string {
  if (count === 0) return 'bg-gray-900 border border-gray-800';
  if (count <= 3) return 'bg-red-900 border border-red-800';
  if (count <= 6) return 'bg-red-700 border border-red-600';
  return 'bg-red-500 border border-red-400';
}

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
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

  const months: { label: string; col: number }[] = [];
  weeks.forEach((week, idx) => {
    const firstDay = week[0];
    if (firstDay.getDate() <= 7) {
      months.push({ label: format(firstDay, 'MMM'), col: idx });
    }
  });

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
        Activity Heatmap — Last 12 months
      </h3>

      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: 720 }}>
          {/* Month labels */}
          <div className="flex mb-2 ml-6">
            {months.map((m, i) => (
              <div
                key={i}
                className="absolute text-xs text-gray-500"
                style={{ left: `${m.col * 16 + 24}px` }}
              >
                {m.label}
              </div>
            ))}
          </div>

          <div className="flex gap-[3px] mt-5">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] mr-1">
              {['', 'M', '', 'W', '', 'F', ''].map((label, i) => (
                <div key={i} className="w-4 h-4 text-xs text-gray-600 flex items-center justify-center">
                  {label}
                </div>
              ))}
            </div>

            {/* Grid */}
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-[3px]">
                {week.map((day, dIdx) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const count = dataMap.get(dateStr) || 0;
                  const isFuture = day > today;

                  return (
                    <motion.div
                      key={dIdx}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: isFuture ? 0.2 : 1, scale: 1 }}
                      transition={{ delay: (wIdx * 7 + dIdx) * 0.001, duration: 0.2 }}
                      className={`w-4 h-4 rounded-sm cursor-pointer transition-all duration-150 hover:ring-1 hover:ring-white/40 ${getCellColor(count)} ${isFuture ? 'opacity-20' : ''}`}
                      onMouseEnter={(e) => {
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        setTooltip({ date: dateStr, count, x: rect.left, y: rect.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 justify-end">
            <span className="text-xs text-gray-500">Less</span>
            {[0, 2, 5, 8].map((val) => (
              <div key={val} className={`w-3 h-3 rounded-sm ${getCellColor(val)}`} />
            ))}
            <span className="text-xs text-gray-500">More</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed z-50 pointer-events-none bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white shadow-xl"
          style={{ left: tooltip.x, top: tooltip.y - 40 }}
        >
          <div className="font-semibold">{format(parseISO(tooltip.date), 'MMMM d, yyyy')}</div>
          <div className="text-gray-400">{tooltip.count} activities</div>
        </motion.div>
      )}
    </div>
  );
}
