'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { format, subDays, startOfWeek, addDays } from 'date-fns';
import type { HeatmapData } from '@/types';

/* ─── Layout constants (pixels) ─────────────────────────────────────
   All positions derived from these — no Tailwind gap approximations.  */
const CELL_W   = 13;   // cell width
const CELL_H   = 13;   // cell height
const H_GAP    = 3;    // horizontal gap between week columns
const V_GAP    = 3;    // vertical gap between day rows
const DAY_COL  = 20;   // width of the Mon/Wed/Fri labels column
const COL_STEP = CELL_W + H_GAP; // 16 px per week column

function weekLeft(i: number) {
  return DAY_COL + H_GAP + i * COL_STEP;
}

function getCellColor(count: number): string {
  if (count === 0) return '#161616';
  if (count <= 2)  return 'rgba(153,27,27,0.6)';
  if (count <= 5)  return 'rgba(185,28,28,0.75)';
  if (count <= 9)  return 'rgba(220,38,38,0.85)';
  return '#ef4444';
}

interface ActivityHeatmapProps {
  data: HeatmapData[];
}

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    date: string; count: number; x: number; y: number;
  } | null>(null);

  const dataMap = new Map(data.map((d) => [d.date, d.count]));

  const today     = new Date();
  const startDate = subDays(today, 364);
  const weekStart = startOfWeek(startDate, { weekStartsOn: 0 });

  const weeks: Date[][] = [];
  for (let w = 0; w < 53; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) week.push(addDays(weekStart, w * 7 + d));
    weeks.push(week);
  }

  // Month labels: show once per month, placed at the first week of that month
  const months: { label: string; col: number }[] = [];
  weeks.forEach((week, idx) => {
    if (week[0].getDate() <= 7) {
      months.push({ label: format(week[0], 'MMM'), col: idx });
    }
  });

  const gridH   = 7 * CELL_H + 6 * V_GAP;   // total height of 7 rows
  const totalW  = DAY_COL + H_GAP + 53 * COL_STEP;
  const MONTH_ROW_H = 18;

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
        Actividad — Últimos 12 meses
      </h3>

      <div className="overflow-x-auto pb-1">
        <div style={{ width: totalW, minWidth: totalW }}>

          {/* Month label row */}
          <div style={{ position: 'relative', height: MONTH_ROW_H, marginBottom: 4 }}>
            {months.map((m, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: weekLeft(m.col),
                  top: 4,
                  fontSize: 10,
                  color: '#6b7280',
                  userSelect: 'none',
                }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div style={{ position: 'relative', height: gridH }}>
            {/* Day-of-week labels */}
            {['', 'L', '', 'X', '', 'V', ''].map((lbl, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: i * (CELL_H + V_GAP) + 1,
                  width: DAY_COL - 4,
                  fontSize: 10,
                  color: '#4b5563',
                  textAlign: 'right',
                  userSelect: 'none',
                }}
              >
                {lbl}
              </span>
            ))}

            {/* Week columns */}
            {weeks.map((week, wIdx) => {
              const x = weekLeft(wIdx);
              return week.map((day, dIdx) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const count   = dataMap.get(dateStr) ?? 0;
                const isFuture = day > today;
                const bg = getCellColor(count);

                return (
                  <div
                    key={`${wIdx}-${dIdx}`}
                    style={{
                      position: 'absolute',
                      left: x,
                      top: dIdx * (CELL_H + V_GAP),
                      width: CELL_W,
                      height: CELL_H,
                      borderRadius: 3,
                      background: bg,
                      opacity: isFuture ? 0.15 : 1,
                      cursor: 'default',
                      transition: 'opacity 0.1s, outline 0.1s',
                      outline: '1px solid rgba(255,255,255,0.04)',
                    }}
                    onMouseEnter={(e) => {
                      if (isFuture) return;
                      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setTooltip({ date: dateStr, count, x: r.left, y: r.top });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onTouchStart={(e) => {
                      if (isFuture) return;
                      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setTooltip({ date: dateStr, count, x: r.left, y: r.top });
                    }}
                    onTouchEnd={() => setTimeout(() => setTooltip(null), 1200)}
                  />
                );
              });
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-3 justify-end">
            <span style={{ fontSize: 10, color: '#6b7280' }}>Menos</span>
            {[0, 2, 5, 9, 12].map((v) => (
              <div
                key={v}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: getCellColor(v),
                  outline: '1px solid rgba(255,255,255,0.04)',
                }}
              />
            ))}
            <span style={{ fontSize: 10, color: '#6b7280' }}>Más</span>
          </div>
        </div>
      </div>

      {/* Tooltip portal */}
      {tooltip && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed pointer-events-none bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-xs text-white shadow-xl"
          style={{ left: tooltip.x, top: tooltip.y - 52, zIndex: 99999 }}
        >
          <div className="font-semibold text-gray-200">
            {format(new Date(tooltip.date + 'T12:00:00'), 'MMMM d, yyyy')}
          </div>
          <div className="text-gray-400 mt-0.5">
            {tooltip.count === 0 ? 'Sin actividad' : `${tooltip.count} actividad${tooltip.count > 1 ? 'es' : ''}`}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
