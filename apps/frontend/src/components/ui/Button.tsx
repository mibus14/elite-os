'use client'

import { motion } from 'framer-motion'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
}

const variants = {
  primary:   'bg-elite-600 hover:bg-elite-700 text-white border border-elite-600 hover:border-elite-neon shadow-glow-red hover:shadow-[0_0_30px_rgba(220,20,60,0.5)]',
  secondary: 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 backdrop-blur-sm',
  ghost:     'bg-transparent hover:bg-white/5 text-gray-300 hover:text-white border border-transparent hover:border-white/10',
  danger:    'bg-red-900/50 hover:bg-red-800/60 text-red-300 border border-red-800/50 hover:border-red-600',
  gold:      'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:border-yellow-400 hover:shadow-glow-gold',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'px-6 py-3 text-base gap-2.5 rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, fullWidth, children, className, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
        whileHover={{ scale: disabled || loading ? 1 : 1.01 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...(props as any)}
      >
        {loading ? (
          <Loader2 className="animate-spin" size={size === 'sm' ? 12 : size === 'lg' ? 18 : 14} />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
