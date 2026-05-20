'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  max?: number
  label?: string
  showPercent?: boolean
  color?: 'red' | 'gold' | 'green' | 'blue' | 'purple'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  animated?: boolean
  className?: string
}

const colorMap = {
  red:    'from-elite-700 to-elite-600',
  gold:   'from-yellow-600 to-yellow-400',
  green:  'from-emerald-700 to-emerald-500',
  blue:   'from-blue-700 to-blue-500',
  purple: 'from-purple-700 to-purple-500',
}

const glowMap = {
  red:    'shadow-[0_0_8px_rgba(220,20,60,0.5)]',
  gold:   'shadow-[0_0_8px_rgba(255,215,0,0.5)]',
  green:  'shadow-[0_0_8px_rgba(34,197,94,0.5)]',
  blue:   'shadow-[0_0_8px_rgba(59,130,246,0.5)]',
  purple: 'shadow-[0_0_8px_rgba(168,85,247,0.5)]',
}

const sizeMap = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
}

export function Progress({
  value,
  max = 100,
  label,
  showPercent = false,
  color = 'red',
  size = 'md',
  animated = true,
  className,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs text-gray-400">{label}</span>}
          {showPercent && <span className="text-xs text-gray-400">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-white/[0.06] rounded-full overflow-hidden', sizeMap[size])}>
        <motion.div
          initial={animated ? { width: 0 } : { width: `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
          className={cn(
            'h-full rounded-full bg-gradient-to-r',
            colorMap[color],
            glowMap[color]
          )}
        />
      </div>
    </div>
  )
}

// Circular progress ring
interface CircleProgressProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  color?: string
  label?: React.ReactNode
  className?: string
}

export function CircleProgress({
  value,
  max = 100,
  size = 80,
  strokeWidth = 6,
  color = '#DC143C',
  label,
  className,
}: CircleProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
        />
      </svg>
      {label && (
        <div className="absolute inset-0 flex items-center justify-center">{label}</div>
      )}
    </div>
  )
}
