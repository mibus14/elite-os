'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Dumbbell, Apple, Activity, BookOpen,
  Target, CheckSquare, TrendingUp, Trophy, MessageCircle,
  Settings, ChevronLeft, ChevronRight, Zap, Flame,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/Progress'
import { CharacterPanel } from '@/components/rpg/CharacterPanel'

const navItems = [
  { href: '/dashboard',   label: 'Panel',          icon: LayoutDashboard },
  { href: '/gym',         label: 'Gimnasio',        icon: Dumbbell },
  { href: '/nutrition',   label: 'Nutrición',       icon: Apple },
  { href: '/cardio',      label: 'Cardio',          icon: Activity },
  { href: '/learning',    label: 'Aprendizaje',     icon: BookOpen },
  { href: '/goals',       label: 'Metas',           icon: Target },
  { href: '/habits',      label: 'Hábitos',         icon: CheckSquare },
  { href: '/finance',     label: 'Finanzas',        icon: TrendingUp },
  { href: '/leaderboard', label: 'Clasificación',   icon: Trophy },
  { href: '/chat',        label: 'Chat',            icon: MessageCircle },
  { href: '/settings',    label: 'Ajustes',         icon: Settings },
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

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  const currentLevelXp = getXpForCurrentLevel(user?.level ?? 1)
  const nextLevelXp    = getXpForNextLevel(user?.level ?? 1)
  const xpInLevel      = (user?.xp ?? 0) - currentLevelXp
  const xpNeeded       = nextLevelXp - currentLevelXp
  const xpPct          = Math.min(100, (xpInLevel / xpNeeded) * 100)

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="relative flex flex-col h-full bg-[#0D0D0D] border-r border-[#1E1E1E] overflow-hidden flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-[#1E1E1E] flex-shrink-0">
        <motion.div
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 overflow-hidden"
        >
          <div className="w-8 h-8 rounded-lg bg-elite-600 flex items-center justify-center flex-shrink-0 shadow-glow-red">
            <span className="text-white font-bold text-sm font-heading">E</span>
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
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
        </motion.div>
      </div>

      {/* User profile */}
      <AnimatePresence>
        {!sidebarCollapsed && user && (
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}>
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
                  {!sidebarCollapsed && (
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
                {active && !sidebarCollapsed && (
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
        <CharacterPanel collapsed={sidebarCollapsed} />
      </div>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-[#1E1E1E] flex-shrink-0">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : (
            <>
              <ChevronLeft size={16} />
              <span className="text-xs">Contraer</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  )
}
