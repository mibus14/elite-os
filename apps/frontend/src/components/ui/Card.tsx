'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  animate?: boolean
  delay?: number
}

const paddingMap = {
  none: '',
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-6',
}

export function Card({
  children,
  className,
  glow = false,
  hover = true,
  padding = 'md',
  animate = true,
  delay = 0,
}: CardProps) {
  const content = (
    <div
      className={cn(
        'bg-[#111111] border border-[#1E1E1E] rounded-2xl transition-all duration-300',
        hover && 'hover:border-elite-600/30 hover:shadow-card-hover',
        glow && 'shadow-glow-red border-elite-600/40',
        paddingMap[padding],
        className
      )}
    >
      {children}
    </div>
  )

  if (!animate) return content

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.23, 1, 0.32, 1] }}
    >
      {content}
    </motion.div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  iconColor?: string
  trend?: number
  suffix?: string
  delay?: number
}

export function StatCard({ label, value, icon, iconColor = 'bg-elite-600/20', trend, suffix, delay = 0 }: StatCardProps) {
  return (
    <Card delay={delay} hover glow={false} padding="md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1.5">{label}</p>
          <p className="text-2xl font-bold font-heading text-white">
            {value}
            {suffix && <span className="text-sm text-gray-400 ml-1">{suffix}</span>}
          </p>
          {trend !== undefined && (
            <p className={cn('text-xs mt-1 flex items-center gap-1', trend >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs yesterday
            </p>
          )}
        </div>
        <div className={cn('p-2.5 rounded-xl', iconColor)}>{icon}</div>
      </div>
    </Card>
  )
}
