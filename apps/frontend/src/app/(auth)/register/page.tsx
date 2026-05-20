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

// ─── RPG Classes ──────────────────────────────────────────────────────────────
interface CharClass {
  id:      string
  emoji:   string
  name:    string
  tagline: string
  bonuses: string[]
}

const CLASSES: CharClass[] = [
  {
    id:      'Guerrero',
    emoji:   '⚔️',
    name:    'Guerrero',
    tagline: 'Forja tu cuerpo en hierro',
    bonuses: ['Gimnasio +50%', 'Cardio +30%'],
  },
  {
    id:      'Monje',
    emoji:   '🧘',
    name:    'Monje',
    tagline: 'La disciplina es el poder',
    bonuses: ['Hábitos +50%', 'Nutrición +20%'],
  },
  {
    id:      'Sabio',
    emoji:   '📚',
    name:    'Sabio',
    tagline: 'El conocimiento es tu arma',
    bonuses: ['Aprendizaje +50%', 'Finanzas +30%'],
  },
  {
    id:      'Asesino',
    emoji:   '🗡️',
    name:    'Asesino',
    tagline: 'Todo o nada — sin excusas',
    bonuses: ['Todos los módulos +20%', 'x2 si completas todo'],
  },
  {
    id:      'Mercader',
    emoji:   '💰',
    name:    'Mercader',
    tagline: 'Domina el juego del dinero',
    bonuses: ['Finanzas +50%', 'Aprendizaje +30%'],
  },
]

// ─── Animations ───────────────────────────────────────────────────────────────
const containerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.09 } },
}

const itemVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } },
}

// ─── Class Card ───────────────────────────────────────────────────────────────
function ClassCard({
  cls,
  selected,
  onSelect,
}: {
  cls: CharClass
  selected: boolean
  onSelect: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 text-left w-full"
      style={
        selected
          ? {
              borderColor: '#DC143C',
              backgroundColor: 'rgba(220,20,60,0.08)',
              boxShadow: '0 0 20px rgba(220,20,60,0.3)',
            }
          : {
              borderColor: 'rgba(255,255,255,0.08)',
              backgroundColor: 'rgba(255,255,255,0.02)',
            }
      }
    >
      {/* Selected check */}
      {selected && (
        <div
          className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#DC143C] flex items-center justify-center"
          style={{ boxShadow: '0 0 8px rgba(220,20,60,0.6)' }}
        >
          <Check size={9} className="text-white" />
        </div>
      )}

      {/* Emoji */}
      <span className="text-2xl leading-none">{cls.emoji}</span>

      {/* Name */}
      <span
        className="text-sm font-bold leading-tight text-center"
        style={{ color: selected ? '#DC143C' : '#fff' }}
      >
        {cls.name}
      </span>

      {/* Tagline */}
      <span className="text-[10px] text-gray-500 text-center leading-tight">
        {cls.tagline}
      </span>

      {/* Bonuses */}
      <div className="flex flex-col gap-0.5 w-full mt-0.5">
        {cls.bonuses.map(b => (
          <span
            key={b}
            className="text-[9px] text-center font-medium"
            style={{ color: selected ? 'rgba(220,20,60,0.8)' : 'rgba(255,255,255,0.35)' }}
          >
            {b}
          </span>
        ))}
      </div>
    </motion.button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const [username,        setUsername]        = useState('')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [selectedAvatar,  setSelectedAvatar]  = useState(0)
  const [selectedSeed,    setSelectedSeed]    = useState(SEEDS[0])
  const [selectedClass,   setSelectedClass]   = useState<string>('Guerrero')
  const [step,            setStep]            = useState<1 | 2>(1)

  const { register, isLoading, error } = useAuth()

  const avatarUrl = `https://api.dicebear.com/8.x/${AVATAR_STYLES[selectedAvatar].style}/svg?seed=${selectedSeed}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1) {
      setStep(2)
      return
    }
    if (password !== confirmPassword) return
    await register({
      username,
      email,
      password,
      avatar: avatarUrl,
      class: selectedClass,
    } as any)
  }

  const passwordMatch = password && confirmPassword && password === confirmPassword
  const step1Complete = username && email && password && confirmPassword && passwordMatch

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

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={
                  step >= s
                    ? { backgroundColor: '#DC143C', color: '#fff', boxShadow: '0 0 10px rgba(220,20,60,0.5)' }
                    : { backgroundColor: 'rgba(255,255,255,0.08)', color: '#6b7280' }
                }
              >
                {s}
              </div>
              {s < 2 && (
                <div
                  className="w-8 h-px transition-all duration-300"
                  style={{ backgroundColor: step > s ? '#DC143C' : 'rgba(255,255,255,0.1)' }}
                />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="glass rounded-2xl p-6"
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Step 1: Profile ── */}
          {step === 1 && (
            <>
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
                disabled={!step1Complete}
                className="w-full"
                icon={<ArrowRight size={18} />}
              >
                Siguiente — Elige tu Clase
              </Button>
            </>
          )}

          {/* ── Step 2: Class Selector ── */}
          {step === 2 && (
            <>
              <div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3 flex items-center gap-1"
                >
                  ← Volver
                </button>

                <label className="block text-xs font-bold text-white uppercase tracking-widest mb-1">
                  Elige tu Clase
                </label>
                <p className="text-[11px] text-gray-500 mb-4">
                  Tu clase define tus bonificaciones de XP en cada módulo
                </p>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {CLASSES.map(cls => (
                    <ClassCard
                      key={cls.id}
                      cls={cls}
                      selected={selectedClass === cls.id}
                      onSelect={() => setSelectedClass(cls.id)}
                    />
                  ))}
                </div>
              </div>

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
                className="w-full"
                icon={<ArrowRight size={18} />}
              >
                Inicializar Perfil
              </Button>
            </>
          )}
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
