'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Check, ArrowRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const AVATAR_STYLES = [
  { style: 'adventurer',   label: 'Adventurer' },
  { style: 'bottts',       label: 'Bot' },
  { style: 'pixel-art',    label: 'Pixel' },
  { style: 'avataaars',    label: 'Human' },
  { style: 'micah',        label: 'Micah' },
  { style: 'lorelei',      label: 'Lorelei' },
]

const SEEDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot']

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
}

const itemVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } },
}

export default function RegisterPage() {
  const [username,        setUsername]        = useState('')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [selectedAvatar,  setSelectedAvatar]  = useState(0)
  const [selectedSeed,    setSelectedSeed]    = useState(SEEDS[0])

  const { register, isLoading, error } = useAuth()

  const avatarUrl = `https://api.dicebear.com/8.x/${AVATAR_STYLES[selectedAvatar].style}/svg?seed=${selectedSeed}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) return
    await register({ username, email, password, avatar: avatarUrl })
  }

  const passwordMatch = password && confirmPassword && password === confirmPassword

  return (
    <motion.div
      className="w-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div className="text-center mb-6" variants={itemVariants}>
        <h1
          className="text-4xl font-black tracking-tight mb-1"
          style={{
            fontFamily: 'Space Grotesk, sans-serif',
            background: 'linear-gradient(135deg, #FF6B6B 0%, #DC143C 60%, #B91C1C 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 20px rgba(220,20,60,0.4))',
          }}
        >
          Join ELITE OS
        </h1>
        <p className="text-dark-100 text-sm">Begin your ascension</p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="glass rounded-2xl p-6"
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar selection */}
          <div>
            <label className="block text-xs font-medium text-dark-100 uppercase tracking-wider mb-3">
              Choose Your Avatar
            </label>

            {/* Preview */}
            <div className="flex justify-center mb-4">
              <motion.div
                className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-elite-600"
                style={{ boxShadow: '0 0 20px rgba(220,20,60,0.4)' }}
                key={avatarUrl}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1,   opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Image src={avatarUrl} alt="Selected avatar" width={80} height={80} className="bg-[#1A1A1A] w-full h-full" />
              </motion.div>
            </div>

            {/* Style selector */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {AVATAR_STYLES.map((av, i) => {
                const url = `https://api.dicebear.com/8.x/${av.style}/svg?seed=${selectedSeed}`
                return (
                  <motion.button
                    key={av.style}
                    type="button"
                    onClick={() => setSelectedAvatar(i)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-200 ${
                      selectedAvatar === i
                        ? 'border-elite-600 bg-elite-600/10'
                        : 'border-dark-400 bg-dark-600/50 hover:border-dark-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1A1A1A]">
                      <Image src={url} alt={av.label} width={40} height={40} />
                    </div>
                    <span className="text-xs text-dark-100">{av.label}</span>
                    {selectedAvatar === i && (
                      <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-elite-600 flex items-center justify-center">
                        <Check size={8} className="text-white" />
                      </div>
                    )}
                  </motion.button>
                )
              })}
            </div>

            {/* Seed picker */}
            <div className="flex gap-1.5 flex-wrap">
              {SEEDS.map(seed => (
                <button
                  key={seed}
                  type="button"
                  onClick={() => setSelectedSeed(seed)}
                  className={`px-2 py-0.5 rounded-full text-xs transition-all duration-200 ${
                    selectedSeed === seed
                      ? 'bg-elite-600 text-white'
                      : 'bg-dark-500 text-dark-100 hover:bg-dark-400'
                  }`}
                >
                  {seed}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-dark-400" />

          <Input
            label="Username"
            type="text"
            placeholder="YourCallsign"
            value={username}
            onChange={e => setUsername(e.target.value)}
            iconLeft={<User size={16} />}
            required
          />

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

          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••••"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            iconRight={
              passwordMatch ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <Lock size={16} />
              )
            }
            error={
              confirmPassword && !passwordMatch ? 'Passwords do not match' : undefined
            }
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

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isLoading}
            disabled={!!(confirmPassword && !passwordMatch)}
            className="w-full"
            icon={<ArrowRight size={18} />}
          >
            Initialize Profile
          </Button>
        </form>
      </motion.div>

      <motion.p variants={itemVariants} className="text-center mt-5 text-sm text-dark-100">
        Already enlisted?{' '}
        <Link href="/login" className="text-elite-accent font-semibold hover:text-white transition-colors">
          Access System
        </Link>
      </motion.p>
    </motion.div>
  )
}
