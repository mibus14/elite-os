'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { io, Socket } from 'socket.io-client'
import { isAuthenticated } from '@/lib/auth'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { BottomNav } from '@/components/layout/BottomNav'
import DebuffBar from '@/components/rpg/DebuffBar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router          = useRouter()
  const pathname        = usePathname()
  const socketRef       = useRef<Socket | null>(null)
  const mainRef         = useRef<HTMLElement>(null)
  const user            = useAuthStore(s => s.user)
  const addNotification = useUIStore(s => s.addNotification)
  const setMobileSidebarOpen = useUIStore(s => s.setMobileSidebarOpen)

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
    }
  }, [router])

  // Reset scroll and close mobile sidebar on every navigation
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    setMobileSidebarOpen(false)
  }, [pathname, setMobileSidebarOpen])

  // Socket.io connection
  useEffect(() => {
    if (!user) return

    const token = typeof window !== 'undefined' ? localStorage.getItem('elite_token') : null
    if (!token) return

    const socket = io(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id)
    })

    socket.on('notification', (data: { title: string; message: string; type?: 'success' | 'info' | 'warning' | 'error' }) => {
      addNotification({ title: data.title, message: data.message, type: data.type ?? 'info' })
    })

    socket.on('xp_gained', (data: { amount: number; reason: string }) => {
      addNotification({
        title:   `+${data.amount} XP`,
        message: data.reason,
        type:    'success',
      })
    })

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user, addNotification])

  return (
    <div
      className="flex bg-[#0A0A0A] overflow-hidden"
      style={{ height: '100dvh' }}
      suppressHydrationWarning
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Topbar */}
        <Topbar />

        {/* Debuff bar — only renders when character has active debuffs */}
        <DebuffBar />

        {/* Content */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' } as React.CSSProperties}
        >
          <motion.div
            key={pathname}
            className="p-3 md:p-6 pb-24 md:pb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  )
}
