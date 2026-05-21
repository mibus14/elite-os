'use client'

import { motion } from 'framer-motion'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-start justify-center overflow-y-auto overflow-x-hidden bg-[#0A0A0A]">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large blurred orbs */}
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(220,20,60,0.12) 0%, transparent 70%)',
            top: '-10%',
            left: '-10%',
          }}
          animate={{
            x: [0, 30, -15, 0],
            y: [0, -20, 10, 0],
            scale: [1, 1.05, 0.97, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(220,20,60,0.08) 0%, transparent 70%)',
            bottom: '-5%',
            right: '-5%',
          }}
          animate={{
            x: [0, -25, 15, 0],
            y: [0, 15, -10, 0],
            scale: [1, 0.95, 1.03, 1],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,215,0,0.04) 0%, transparent 70%)',
            top: '40%',
            left: '60%',
          }}
          animate={{
            x: [0, 20, -10, 0],
            y: [0, -15, 8, 0],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(220,20,60,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(220,20,60,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Scan line effect */}
        <motion.div
          className="absolute left-0 right-0 h-px opacity-10"
          style={{ background: 'linear-gradient(90deg, transparent, #DC143C, transparent)' }}
          animate={{ y: ['0vh', '100vh'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* ELITE OS Logo header */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-lg bg-elite-600 opacity-20 animate-glow-pulse" />
            <div
              className="absolute inset-0 rounded-lg border border-elite-600 opacity-60"
              style={{ boxShadow: '0 0 12px rgba(220,20,60,0.4)' }}
            />
            <span
              className="relative text-xl font-black text-elite-600"
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                textShadow: '0 0 16px rgba(220,20,60,0.7)',
              }}
            >
              E
            </span>
          </div>
          <span
            className="text-lg font-bold tracking-[0.2em] text-white uppercase"
            style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.25em' }}
          >
            ELITE OS
          </span>
        </motion.div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md px-4 pt-24 pb-16">
        {children}
      </div>

      {/* Bottom tagline */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <p className="text-xs text-dark-50 tracking-widest uppercase">
          Dominate Every Day
        </p>
      </div>
    </div>
  )
}
