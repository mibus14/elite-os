'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { isAuthenticated } from '@/lib/auth'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { BottomNav } from '@/components/layout/BottomNav'
import DebuffBar from '@/components/rpg/DebuffBar'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router          = useRouter()
  const pathname        = usePathname()
  const socketRef       = useRef<Socket | null>(null)
  const mainRef         = useRef<HTMLElement>(null)
  const user            = useAuthStore(s => s.user)
  const addNotification = useUIStore(s => s.addNotification)
  // Keep addNotification stable in the socket effect via ref
  const addNotificationRef = useRef(addNotification)
  addNotificationRef.current = addNotification
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

  // Socket.io — only connect in dev or when socket URL differs from API URL.
  // Vercel serverless doesn't support WebSockets; avoid retry storms on mobile.
  useEffect(() => {
    if (!user) return

    const token = typeof window !== 'undefined' ? localStorage.getItem('elite_token') : null
    if (!token) return

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001', {
      auth: { token },
      transports: ['polling', 'websocket'], // polling first: faster initial connection on mobile
      reconnectionAttempts: 1,              // fail fast — don't retry-storm on mobile
      reconnectionDelay: 5000,
      timeout: 8000,
    })

    socketRef.current = socket

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error (non-fatal):', err.message)
    })

    socket.on('notification', (data: { title: string; message: string; type?: 'success' | 'info' | 'warning' | 'error' }) => {
      addNotificationRef.current({ title: data.title, message: data.message, type: data.type ?? 'info' })
    })

    socket.on('xp_gained', (data: { amount: number; reason: string }) => {
      addNotificationRef.current({ title: `+${data.amount} XP`, message: data.reason, type: 'success' })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user]) // addNotification excluded via ref — prevents socket reconnect on every notification

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

        {/* Debuff bar */}
        <DebuffBar />

        {/* Content — ErrorBoundary resets on every navigation */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' } as React.CSSProperties}
        >
          {/* Simple CSS fade — no Framer Motion in the hot navigation path */}
          <div
            key={pathname}
            className="p-3 md:p-6 pb-24 md:pb-6 animate-fadeIn"
          >
            <ErrorBoundary key={pathname}>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  )
}
