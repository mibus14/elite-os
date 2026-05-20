'use client';

import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { MacroData } from '@/types';

interface MacroDonutProps {
  macros: MacroData;
}

const MACRO_COLORS = {
  Protein: '#3B82F6',
  Carbs: '#F59E0B',
  Fat: '#EF4444',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl px-3 py-2 shadow-xl">
        <p className="text-white font-semibold">{payload[0].name}</p>
        <p className="text-gray-300 text-sm">{payload[0].value}g</p>
      </div>
    );
  }
  return null;
};

export default function MacroDonut({ macros }: MacroDonutProps) {
  const chartData = [
    { name: 'Protein', value: macros.protein },
    { name: 'Carbs', value: macros.carbs },
    { name: 'Fat', value: macros.fat },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6"
    >
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
        Macro Split
      </h3>

      <div className="relative">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={MACRO_COLORS[entry.name as keyof typeof MACRO_COLORS]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-white">{macros.totalCalories}</span>
          <span className="text-xs text-gray-500">kcal</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-around mt-3">
        {chartData.map((item) => (
          <div key={item.name} className="flex flex-col items-center gap-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: MACRO_COLORS[item.name as keyof typeof MACRO_COLORS] }}
            />
            <span className="text-xs text-gray-400">{item.name}</span>
            <span className="text-sm font-semibold text-white">{item.value}g</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
