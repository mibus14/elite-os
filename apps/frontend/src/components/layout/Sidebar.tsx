'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Dumbbell, Apple, Activity, BookOpen,
  Target, CheckSquare, TrendingUp, Trophy, MessageCircle,
  Settings, ChevronLeft, ChevronRight, Zap, Flame, Sword, X, Moon, BarChart2, Shield,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/Progress'
import { CharacterPanel } from '@/components/rpg/CharacterPanel'
import { rpgApi, seasonsApi } from '@/lib/api'

const navItems = [
  { href: '/dashboard',   label: 'Cuartel',         icon: LayoutDashboard },
  { href: '/gym',         label: 'Forja',           icon: Dumbbell },
  { href: '/nutrition',   label: 'Taberna',         icon: Apple },
  { href: '/cardio',      label: 'Campo',           icon: Activity },
  { href: '/learning',    label: 'Grimorio',        icon: BookOpen },
  { href: '/goals',       label: 'Misiones',        icon: Target },
  { href: '/habits',      label: 'Juramentos',      icon: CheckSquare },
  { href: '/sleep',       label: 'Santuario',       icon: Moon },
  { href: '/finance',     label: 'Tesorería',       icon: TrendingUp },
  { href: '/savings',     label: 'Coliseo',         icon: Sword },
  { href: '/leaderboard', label: 'Héroes',          icon: Trophy },
  { href: '/chat',        label: 'Mensajería',      icon: MessageCircle },
  { href: '/seasons',     label: 'Temporada',       icon: Shield },
  { href: '/report',      label: 'Informe',         icon: BarChart2 },
  { href: '/settings',    label: 'Pergamino',       icon: Settings },
]

const rankColors: Record<string, string> = {
  Bronze:   'text-amber-700',
  Silver:   'text-gray-400',
  Gold:     'text-yellow-400',
  Platinum: 'text-cyan-300',
  Diamond:  'text-blue-300',
}

function getXpForNextLevel(level: number) { return level * 500 }
function getXpForCurrentLevel(level: number) { return (level - 1) * 500 }

interface DailyCombo {
  gymDone: boolean; nutritionDone: boolean; habitsDone: boolean;
  cardioDone: boolean; learningDone: boolean; financeDone: boolean;
  comboActive: boolean; comboMultiplier: number;
}

const COMBO_MODULES = [
  { key: 'gymDone',       icon: '🏋️', label: 'Forja' },
  { key: 'nutritionDone', icon: '🥗', label: 'Taberna' },
  { key: 'cardioDone',    icon: '🏃', label: 'Campo' },
  { key: 'habitsDone',    icon: '✅', label: 'Juramentos' },
  { key: 'learningDone',  icon: '📖', label: 'Grimorio' },
  { key: 'financeDone',   icon: '💰', label: 'Tesorería' },
] as const

function DailyComboTracker({ collapsed }: { collapsed: boolean }) {
  const { data } = useQuery({
    queryKey: ['rpg-combo-sidebar'],
    queryFn: () => rpgApi.combo().then(r => r.data.combo as DailyCombo),
    staleTime: 60_000,
    retry: false,
  })

  const done = COMBO_MODULES.filter(m => data?.[m.key as keyof DailyCombo]).length
  const multiplier = data?.comboMultiplier ?? 1.0

  if (collapsed) {
    return (
      <div className="px-2 py-2 flex flex-col items-center gap-1">
        <div className="text-[10px] font-bold text-gray-600">{done}/6</div>
        <div className="w-6 h-6 rounded-full border border-elite-600/30 flex items-center justify-center">
          <span className="text-[10px]">{done >= 3 ? '🔥' : '○'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 py-3 border-b border-[#1E1E1E]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Combo diario</span>
        {done >= 3 && (
          <span className="text-[10px] font-bold text-orange-400">x{multiplier.toFixed(1)} XP 🔥</span>
        )}
      </div>
      <div className="flex gap-1.5">
        {COMBO_MODULES.map((mod) => {
          const isDone = data?.[mod.key as keyof DailyCombo] ?? false
          return (
            <motion.div
              key={mod.key}
              title={mod.label}
              animate={isDone ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3 }}
              className={cn(
                'flex-1 h-7 rounded-lg flex items-center justify-center text-sm transition-all',
                isDone
                  ? 'bg-elite-600/20 border border-elite-600/40 shadow-[0_0_8px_rgba(220,20,60,0.3)]'
                  : 'bg-white/[0.03] border border-white/5 opacity-40'
              )}
            >
              {mod.icon}
            </motion.div>
          )
        })}
      </div>
      <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(done / 6) * 100}%` }}
          transition={{ duration: 0.5 }}
          className={cn(
            'h-full rounded-full',
            done >= 6 ? 'bg-yellow-400' : done >= 3 ? 'bg-elite-600' : 'bg-gray-600'
          )}
        />
      </div>
    </div>
  )
}

function SidebarContent({
  collapsed,
  onNavClick,
}: {
  collapsed: boolean
  onNavClick?: () => void
}) {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { toggleSidebar } = useUIStore()

  const currentLevelXp = getXpForCurrentLevel(user?.level ?? 1)
  const nextLevelXp    = getXpForNextLevel(user?.level ?? 1)
  const xpInLevel      = (user?.xp ?? 0) - currentLevelXp
  const xpNeeded       = nextLevelXp - currentLevelXp
  const xpPct          = Math.min(100, (xpInLevel / xpNeeded) * 100)

  const { data: seasonData } = useQuery({
    queryKey: ['seasons-current-sidebar'],
    queryFn: () => seasonsApi.current().then(r => r.data),
    staleTime: 300_000,
    retry: false,
  })

  return (
    <div className="flex flex-col h-full bg-[#0D0D0D] border-r border-[#1E1E1E] overflow-hidden">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-[#1E1E1E] flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-elite-600 flex items-center justify-center flex-shrink-0 shadow-glow-red">
            <span className="text-white font-bold text-sm font-heading">E</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-white font-bold text-lg font-heading tracking-tight whitespace-nowrap"
              >
                ELITE <span className="text-elite-600">OS</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* User profile */}
      <AnimatePresence>
        {!collapsed && user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-4 border-b border-[#1E1E1E]"
          >
            <div className="flex items-center gap-3 mb-3">
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                alt={user.username}
                className="w-9 h-9 rounded-full border border-elite-600/30 flex-shrink-0"
              />
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">{user.username}</p>
                <p className={cn('text-xs font-medium', rankColors[user.rank] ?? 'text-gray-400')}>
                  {user.rank} · Lv.{user.level}
                </p>
              </div>
            </div>
            <Progress value={xpPct} max={100} color="red" size="xs" />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-gray-600 flex items-center gap-1">
                <Zap size={9} className="text-yellow-400" />
                {user.xp.toLocaleString()} XP
              </span>
              <span className="text-[10px] text-gray-600 flex items-center gap-1">
                <Flame size={9} className="text-orange-400" />
                {user.streak}d
              </span>
            </div>
            {seasonData?.season && (
              <div className="flex items-center justify-between mt-2 px-2 py-1 bg-elite-600/10 border border-elite-600/20 rounded-lg">
                <span className="text-[10px] font-bold text-elite-600 flex items-center gap-1">
                  <Shield size={9} />
                  T{seasonData.season.number}
                </span>
                <span className="text-[10px] text-gray-500">{seasonData.season.daysLeft}d restantes</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Combo Tracker */}
      <DailyComboTracker collapsed={collapsed} />

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} onClick={onNavClick}>
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group',
                  active
                    ? 'bg-elite-600/15 text-white border border-elite-600/25 shadow-[0_0_12px_rgba(220,20,60,0.1)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                )}
              >
                <Icon
                  size={18}
                  className={cn(
                    'flex-shrink-0 transition-colors',
                    active ? 'text-elite-600' : 'text-gray-400 group-hover:text-gray-200'
                  )}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {active && !collapsed && (
                  <motion.div
                    layoutId="nav-active"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-elite-600"
                  />
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Character panel */}
      <div className="pb-2 border-t border-[#1E1E1E] pt-3 flex-shrink-0">
        <CharacterPanel collapsed={collapsed} />
      </div>

      {/* Collapse toggle (desktop only) */}
      <div className="p-3 border-t border-[#1E1E1E] flex-shrink-0 hidden md:block">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <>
              <ChevronLeft size={16} />
              <span className="text-xs">Contraer</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore()

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="relative hidden md:flex flex-col h-full flex-shrink-0"
      >
        <SidebarContent collapsed={sidebarCollapsed} />
      </motion.aside>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden cursor-pointer"
              onClick={() => setMobileSidebarOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed left-0 top-0 bottom-0 z-60 w-72 md:hidden"
            >
              <div className="h-full relative">
                {/* Close button */}
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="absolute top-4 right-4 z-10 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X size={18} />
                </button>
                <SidebarContent
                  collapsed={false}
                  onNavClick={() => setMobileSidebarOpen(false)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
