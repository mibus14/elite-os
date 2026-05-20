'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const PREVIEW_USERS = [
  { name: 'Diego',      seed: 'diego',      style: 'adventurer' },
  { name: 'Pedro',      seed: 'pedro',      style: 'adventurer' },
  { name: 'Cristopher', seed: 'cristopher', style: 'adventurer' },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
}

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading, error } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await login({ email, password })
  }

  return (
    <motion.div
      className="w-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div className="text-center mb-8" variants={itemVariants}>
        <motion.h1
          className="text-5xl font-black tracking-tight mb-2"
          style={{
            fontFamily: 'Space Grotesk, sans-serif',
            background: 'linear-gradient(135deg, #FF6B6B 0%, #DC143C 50%, #B91C1C 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none',
            filter: 'drop-shadow(0 0 24px rgba(220,20,60,0.5))',
          }}
        >
          ELITE OS
        </motion.h1>
        <p className="text-dark-100 text-sm tracking-widest uppercase">
          Your Personal Command Center
        </p>

        {/* Live indicator */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-dark-100">System Online</span>
        </div>
      </motion.div>

      {/* Preview users */}
      <motion.div variants={itemVariants} className="mb-6">
        <p className="text-center text-xs text-dark-50 uppercase tracking-wider mb-3">Active Operators</p>
        <div className="flex justify-center gap-4">
          {PREVIEW_USERS.map((user, i) => (
            <motion.div
              key={user.name}
              className="flex flex-col items-center gap-1 cursor-pointer group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              onClick={() => setEmail(`${user.seed}@eliteos.app`)}
            >
              <div
                className="w-12 h-12 rounded-full border-2 border-transparent group-hover:border-elite-600 transition-all duration-200 overflow-hidden"
                style={{ boxShadow: '0 0 0 1px rgba(220,20,60,0.1)' }}
              >
                <Image
                  src={`https://api.dicebear.com/8.x/${user.style}/svg?seed=${user.seed}`}
                  alt={user.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover bg-[#1A1A1A]"
                />
              </div>
              <span className="text-xs text-dark-100 group-hover:text-white transition-colors">
                {user.name}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Card */}
      <motion.div
        variants={itemVariants}
        className="glass rounded-2xl p-7"
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email"
            type="email"
            placeholder="operator@eliteos.app"
            value={email}
            onChange={e => setEmail(e.target.value)}
            iconLeft={<Mail size={16} />}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            iconLeft={<Lock size={16} />}
            required
          />

          {error && (
            <motion.p
              className="text-sm text-elite-accent text-center"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.p>
          )}

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-dark-100 cursor-pointer">
              <input type="checkbox" className="accent-elite-600 w-3 h-3" />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-elite-accent hover:text-elite-neon transition-colors">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isLoading}
            className="w-full"
            icon={<ArrowRight size={18} />}
          >
            Access System
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-dark-400" />
          <span className="text-xs text-dark-50">OR</span>
          <div className="flex-1 h-px bg-dark-400" />
        </div>

        {/* Quick access info */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-elite-600/5 border border-elite-600/15">
          <Zap size={14} className="text-elite-gold mt-0.5 flex-shrink-0" />
          <p className="text-xs text-dark-100">
            Click any operator avatar above to pre-fill their email and access quickly.
          </p>
        </div>
      </motion.div>

      {/* Register link */}
      <motion.p variants={itemVariants} className="text-center mt-5 text-sm text-dark-100">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="text-elite-accent font-semibold hover:text-white transition-colors"
        >
          Enlist Now
        </Link>
      </motion.p>
    </motion.div>
  )
}
