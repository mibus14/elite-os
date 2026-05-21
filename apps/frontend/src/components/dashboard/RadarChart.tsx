'use client';

import { motion } from 'framer-motion';
import {
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { RadarDataPoint } from '@/types';

interface RadarChartProps {
  data: RadarDataPoint[];
}

export default function RadarChart({ data }: RadarChartProps) {
  const hasActivity = data.length > 0 && data.some((d) => d.value > 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6 h-full"
    >
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
        Performance Radar
      </h3>

      {!hasActivity ? (
        <div className="flex flex-col items-center justify-center h-[260px] gap-3 text-center">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center opacity-40">
            <span className="text-2xl">📡</span>
          </div>
          <p className="text-sm text-gray-600">Sin actividad registrada aún</p>
          <p className="text-xs text-gray-700">Completa hábitos, entrena o registra comidas para ver tu radar</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <RechartsRadar data={data}>
            <PolarGrid stroke="#1A1A1A" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 600 }}
            />
            <Radar
              name="Score"
              dataKey="value"
              stroke="#DC143C"
              fill="#DC143C"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={{
                background: '#111111',
                border: '1px solid #1A1A1A',
                borderRadius: 8,
                color: '#fff',
              }}
            />
          </RechartsRadar>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}
