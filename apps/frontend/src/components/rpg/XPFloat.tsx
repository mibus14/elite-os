'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface XPFloatProps {
  /** XP amount to display (e.g. 50 → "+50 XP") */
  amount: number;
  /** Whether the animation is currently active */
  active: boolean;
  /** Called when the animation finishes */
  onComplete: () => void;
  /** When true, uses golden color (combo active) instead of crimson */
  combo?: boolean;
  /** Optional className for positioning the container */
  className?: string;
}

/**
 * Floating "+N XP" text that rises and fades out.
 *
 * Usage:
 *   <XPFloat amount={50} active={showXP} onComplete={() => setShowXP(false)} />
 *
 * Position the parent relatively; this component is absolutely positioned
 * centered within its parent by default. Pass className to override placement.
 */
export default function XPFloat({
  amount,
  active,
  onComplete,
  combo = false,
  className = '',
}: XPFloatProps) {
  // Notify parent when animation completes
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => onComplete(), 1600);
    return () => clearTimeout(timer);
  }, [active, onComplete]);

  const color = combo ? '#EAB308' : '#DC143C';
  const glow = combo
    ? '0 0 12px rgba(234,179,8,0.8)'
    : '0 0 12px rgba(220,20,60,0.8)';

  return (
    <AnimatePresence>
      {active && (
        <motion.span
          key="xp-float"
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 0, y: -80, scale: 1.15 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className={`absolute pointer-events-none select-none font-black text-xl z-50 ${className}`}
          style={{
            color,
            textShadow: glow,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          +{amount} XP
        </motion.span>
      )}
    </AnimatePresence>
  );
}
