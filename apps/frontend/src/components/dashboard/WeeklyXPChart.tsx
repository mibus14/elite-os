'use client';

import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { WeeklyXPData } from '@/types';

interface WeeklyXPChartProps {
  data: WeeklyXPData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl px-4 py-2 shadow-xl">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        <p className="text-white font-bold text-lg">{payload[0].value} XP</p>
      </div>
    );
  }
  return null;
};

export default function WeeklyXPChart({ data }: WeeklyXPChartProps) {
  const maxXP = Math.max(...data.map((d) => d.xp), 1);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6 h-full"
    >
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
        Weekly XP
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barSize={28} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#1A1A1A" />
          <XAxis
            dataKey="day"
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(220,20,60,0.05)' }} />
          <Bar dataKey="xp" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.xp === maxXP ? '#DC143C' : '#7f1d1d'}
                opacity={entry.xp === 0 ? 0.3 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
