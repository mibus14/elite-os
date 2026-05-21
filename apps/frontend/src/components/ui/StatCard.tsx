'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label:      string
  value:      number | string
  icon:       React.ReactNode
  iconBg?:    string
  trend?:     number
  suffix?:    string
  prefix?:    string
  animate?:   boolean
  delay?:     number
  className?: string
  glowing?:   boolean
}

function useCountUp(target: number, duration = 1200, start = true) {
  const [count, setCount] = useState(0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!start) return
    const startTime = performance.now()
    const startVal  = 0

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(startVal + (target - startVal) * eased))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step)
      }
    }
    frameRef.current = requestAnimationFrame(step)
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current)
    }
  }, [target, duration, start])

  return count
}

export default function StatCard({
  label,
  value,
  icon,
  iconBg     = 'bg-elite-600/15',
  trend,
  suffix,
  prefix,
  animate    = true,
  delay      = 0,
  className,
  glowing    = false,
}: StatCardProps) {
  const isNumeric = typeof value === 'number'
  const [visible, setVisible] = useState(!animate)
  const countVal  = useCountUp(isNumeric ? (value as number) : 0, 1200, visible && isNumeric)

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.23, 1, 0.32, 1] }}
      onAnimationComplete={() => setVisible(true)}
      className={cn(
        'relative bg-[#111111] border border-[#1E1E1E] rounded-2xl p-5 transition-all duration-300',
        'hover:border-elite-600/20 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_16px_rgba(220,20,60,0.08)]',
        glowing && 'border-elite-600/30 shadow-glow-red',
        className
      )}
    >
      {/* Background accent */}
      <div className="absolute top-0 right-0 w-24 h-24 opacity-5 rounded-2xl overflow-hidden pointer-events-none">
        <div className="w-full h-full bg-gradient-radial from-elite-600 to-transparent" />
      </div>

      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0">
          {/* Label */}
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-medium">
            {label}
          </p>

          {/* Value */}
          <div className="flex items-baseline gap-1 mb-2">
            {prefix && <span className="text-sm text-gray-400">{prefix}</span>}
            <span
              className="text-2xl font-bold text-white"
              style={{ fontFamily: 'Space Grotesk, sans-serif', fontVariantNumeric: 'tabular-nums' }}
            >
              {isNumeric ? countVal.toLocaleString() : value}
            </span>
            {suffix && <span className="text-sm text-gray-400 ml-0.5">{suffix}</span>}
          </div>

          {/* Trend */}
          {trend !== undefined && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.3 }}
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                trend > 0  ? 'text-emerald-400 bg-emerald-500/10' :
                trend < 0  ? 'text-red-400 bg-red-500/10' :
                             'text-gray-400 bg-white/5'
              )}
            >
              {trend > 0  ? <TrendingUp size={11} /> :
               trend < 0  ? <TrendingDown size={11} /> :
                            <Minus size={11} />}
              {trend > 0 ? '+' : ''}{trend}% vs yesterday
            </motion.div>
          )}
        </div>

        {/* Icon */}
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-3', iconBg)}>
          {icon}
        </div>
      </div>
    </motion.div>
  )
}
