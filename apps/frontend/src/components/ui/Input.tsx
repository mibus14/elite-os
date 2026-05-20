'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, iconLeft, iconRight, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-300">
            {label}
          </label>
        )}
        <div className="relative">
          {iconLeft && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {iconLeft}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full bg-white/[0.04] border rounded-xl px-4 py-2.5 text-sm text-white',
              'placeholder:text-gray-600 outline-none transition-all duration-200',
              'focus:border-elite-600 focus:bg-white/[0.06]',
              'focus:shadow-[0_0_0_3px_rgba(220,20,60,0.15),0_0_12px_rgba(220,20,60,0.15)]',
              error
                ? 'border-red-500/60 focus:border-red-500'
                : 'border-white/10 hover:border-white/20',
              iconLeft && 'pl-10',
              iconRight && 'pr-10',
              className
            )}
            {...props}
          />
          {iconRight && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {iconRight}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
