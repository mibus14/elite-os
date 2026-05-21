'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Dumbbell, CheckSquare, Trophy, MoreHorizontal,
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

const PRIMARY_NAV = [
  { href: '/dashboard', label: 'Cuartel',    icon: LayoutDashboard },
  { href: '/gym',       label: 'Forja',      icon: Dumbbell },
  { href: '/habits',    label: 'Juramentos', icon: CheckSquare },
  { href: '/leaderboard', label: 'Héroes',   icon: Trophy },
]

export function BottomNav() {
  const pathname = usePathname()
  const { toggleMobileSidebar, setMobileSidebarOpen } = useUIStore()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#0D0D0D]/95 backdrop-blur-md border-t border-[#1E1E1E]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-16">
        {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2 active:opacity-70 transition-opacity"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                active
                  ? 'bg-[#DC143C]/15 shadow-[0_0_12px_rgba(220,20,60,0.3)]'
                  : 'bg-transparent'
              )}>
                <Icon
                  size={20}
                  className={active ? 'text-[#DC143C]' : 'text-gray-500'}
                />
              </div>
              <span className={cn(
                'text-[10px] font-medium leading-none',
                active ? 'text-[#DC143C]' : 'text-gray-600'
              )}>
                {label}
              </span>
            </Link>
          )
        })}

        {/* More button — opens the full sidebar drawer */}
        <button
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2 active:opacity-70 transition-opacity"
          onClick={toggleMobileSidebar}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-transparent">
            <MoreHorizontal size={20} className="text-gray-500" />
          </div>
          <span className="text-[10px] font-medium leading-none text-gray-600">Más</span>
        </button>
      </div>
    </nav>
  )
}
