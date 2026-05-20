'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, LogOut, User, Settings, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export function Topbar({ title }: { title?: string }) {
  const { user, logout } = useAuthStore()
  const { notifications } = useUIStore()
  const router = useRouter()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-[#1E1E1E] bg-[#0D0D0D]/80 backdrop-blur-md flex-shrink-0">
      {/* Title */}
      <div>
        <h1 className="text-lg font-bold font-heading text-white">{title}</h1>
        <p className="text-xs text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-elite-600 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute right-0 top-12 w-72 bg-[#111111] border border-[#1E1E1E] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-[#1E1E1E]">
                  <p className="text-sm font-semibold text-white">Notifications</p>
                </div>
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-500 text-center">No notifications</p>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div key={n.id} className={cn('px-4 py-3 border-b border-[#1A1A1A] last:border-0', !n.read && 'bg-elite-600/5')}>
                      <p className="text-sm text-white">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/5 transition-all"
          >
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
              alt={user?.username}
              className="w-7 h-7 rounded-full border border-elite-600/30"
            />
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-white leading-none">{user?.username}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Lv.{user?.level} · {user?.rank}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute right-0 top-12 w-48 bg-[#111111] border border-[#1E1E1E] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
              >
                <button
                  onClick={() => { router.push('/settings'); setUserMenuOpen(false) }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  <User size={15} /> Profile
                </button>
                <button
                  onClick={() => { router.push('/settings'); setUserMenuOpen(false) }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Settings size={15} /> Settings
                </button>
                <div className="border-t border-[#1E1E1E] mx-3" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/10 transition-all"
                >
                  <LogOut size={15} /> Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
