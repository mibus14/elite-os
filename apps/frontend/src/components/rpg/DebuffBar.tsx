'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { differenceInHours, parseISO } from 'date-fns';
import { rpgApi } from '@/lib/api';
import type { RPGCharacter, RPGDebuff } from '@/types';

/* ─── Mock character fallback (used when API is unavailable) ───── */
const mockCharacter: RPGCharacter = {
  inPenitence: false,
  debuffs: [],
  comboActive: false,
  comboModulesCompleted: 0,
  comboModulesRequired: 3,
  comboModules: [],
};

function hoursUntilExpiry(expiresAt: string): number {
  return Math.max(0, differenceInHours(parseISO(expiresAt), new Date()));
}

function DebuffPill({ debuff }: { debuff: RPGDebuff }) {
  const hours = hoursUntilExpiry(debuff.expiresAt);

  return (
    <motion.div
      animate={{ opacity: [1, 0.55, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-800/40 bg-red-950/60 text-xs text-red-300 whitespace-nowrap"
    >
      <span>{debuff.icon}</span>
      <span className="font-medium">{debuff.name}</span>
      <span className="text-red-500">—</span>
      <span className="text-red-400">expira en {hours}h</span>
    </motion.div>
  );
}

export default function DebuffBar() {
  const { data } = useQuery<RPGCharacter>({
    queryKey: ['rpg-character'],
    queryFn: () => rpgApi.character().then((r) => r.data.character as RPGCharacter),
    staleTime: 60_000,
    // Return mock on error so the bar just stays hidden
    retry: false,
  });

  const character = data ?? mockCharacter;
  const debuffs = character.debuffs ?? [];
  const hasDebuffs = debuffs.length > 0;

  return (
    <AnimatePresence>
      {hasDebuffs && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden flex-shrink-0"
        >
          <div className="flex items-center gap-3 px-6 py-2 bg-red-950/50 border-b border-red-800/30">
            {/* Left: skull + count */}
            <div className="flex items-center gap-2 text-red-400 flex-shrink-0">
              <span className="text-base leading-none">&#x1F480;</span>
              <span className="text-xs font-semibold uppercase tracking-widest whitespace-nowrap">
                {debuffs.length} debuff{debuffs.length !== 1 ? 's' : ''} activo
                {debuffs.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Divider */}
            <div className="w-px h-4 bg-red-800/40 flex-shrink-0" />

            {/* Scrollable pills */}
            <div className="flex items-center gap-2 overflow-x-auto flex-1 scrollbar-none">
              {debuffs.map((d) => (
                <DebuffPill key={d.id} debuff={d} />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
