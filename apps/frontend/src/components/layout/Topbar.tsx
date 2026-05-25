'use client'

import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Bell, LogOut, User, Settings, ChevronDown, Zap, Menu, MessageCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { useRouter, usePathname } from 'next/navigation'
import { cn, getAvatarUrl } from '@/lib/utils'
import { format } from 'date-fns'
import type { RPGCharacter } from '@/types'
import { rpgApi, dashboardApi, messagesApi, getLocalDate } from '@/lib/api'

interface DerivedNotif {
  id: string
  icon: string
  text: string
  time: string
}

export function Topbar({ title }: { title?: string }) {
  const { user, logout } = useAuthStore()
  const { notifications: storeNotifs, toggleMobileSidebar } = useUIStore()
  const router = useRouter()
  const pathname = usePathname()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [dateStr, setDateStr] = useState('')
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setDateStr(format(new Date(), 'EEEE, MMMM d, yyyy')); setMounted(true) }, [])

  useEffect(() => {
    setUserMenuOpen(false)
    setNotifOpen(false)
  }, [pathname])

  const { data: character } = useQuery<RPGCharacter>({
    queryKey: ['rpg-character'],
    queryFn: () => rpgApi.character().then((r) => r.data.character as RPGCharacter),
    staleTime: 60_000,
    retry: false,
  })

  const { data: dashStats } = useQuery({
    queryKey: ['dashboard-stats', getLocalDate()],
    queryFn: () => dashboardApi.stats().then(r => r.data),
    staleTime: 60_000,
    retry: false,
  })
  const todayXP: number = (dashStats as { todayXP?: number })?.todayXP ?? 0

  const { data: unreadMsgs } = useQuery({
    queryKey: ['messages-unread'],
    queryFn: () => messagesApi.unreadCount().then(r => r.data.count as number),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: false,
  })

  const rpgNotifications = useMemo<DerivedNotif[]>(() => {
    const n: DerivedNotif[] = []
    if (character?.debuffs && character.debuffs.length > 0) {
      n.push({ id: 'debuff', icon: '💀', text: `${character.debuffs[0].name} activo`, time: 'Ahora' })
    }
    if (character?.comboActive) {
      n.push({ id: 'combo', icon: '🔥', text: 'Combo del día activo — x1.5 XP', time: 'Hoy' })
    }
    if (character?.inPenitence) {
      n.push({ id: 'penitence', icon: '💀', text: '¡Estás en Penitencia! Completa la tarea para continuar', time: 'Ahora' })
    }
    return n
  }, [character])

  const allNotifications = useMemo<DerivedNotif[]>(() => {
    const fromStore: DerivedNotif[] = storeNotifs.map((n) => ({
      id: n.id,
      icon: '🔔',
      text: n.title + (n.message ? ` — ${n.message}` : ''),
      time: 'Hoy',
    }))
    const seen = new Set<string>()
    return [...rpgNotifications, ...fromStore].filter((n) => {
      if (seen.has(n.id)) return false
      seen.add(n.id)
      return true
    })
  }, [rpgNotifications, storeNotifs])

  const msgUnread   = unreadMsgs ?? 0
  const unreadCount = allNotifications.length + (msgUnread > 0 ? 1 : 0)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <header className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6 border-b border-[#1E1E1E] bg-[#0D0D0D]/80 backdrop-blur-md flex-shrink-0">
      {/* Left: hamburger (mobile) + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-base md:text-lg font-bold font-heading text-white leading-tight">{title}</h1>
          <p className="text-xs text-gray-500 hidden sm:block">{dateStr}</p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Live streak + today XP */}
        {(user?.streak ?? 0) > 0 && (
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8">
            <span className="flex items-center gap-1 text-sm font-semibold text-orange-400">
              🔥 {user?.streak}d
            </span>
            <div className="w-px h-4 bg-white/10" />
            <span className="flex items-center gap-1 text-sm font-semibold text-yellow-400">
              <Zap size={13} />
              {todayXP} XP
            </span>
          </div>
        )}

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

          {mounted && notifOpen && createPortal(
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setNotifOpen(false)} />
              <div className="fixed top-14 md:top-16 right-3 md:right-6 w-80 bg-[#111111] border border-[#1E1E1E] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-[9999] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1E1E1E] flex items-center justify-between">
                  <p className="text-sm font-bold text-white">Notificaciones</p>
                  {unreadCount > 0 && (
                    <span className="text-xs font-bold text-[#DC143C]">{unreadCount} nueva{unreadCount !== 1 ? 's' : ''}</span>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {/* Messages section */}
                  {msgUnread > 0 && (
                    <button
                      onClick={() => { router.push('/chat'); setNotifOpen(false) }}
                      className="w-full flex items-center gap-3 px-4 py-3 border-b border-[#1A1A1A] hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#DC143C]/15 flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-4 h-4 text-[#DC143C]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-semibold leading-snug">
                          {msgUnread} mensaje{msgUnread !== 1 ? 's' : ''} sin leer
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">Toca para ir al chat</p>
                      </div>
                      <span className="flex-shrink-0 min-w-[20px] h-5 rounded-full bg-[#DC143C] text-white text-[10px] font-bold flex items-center justify-center px-1.5">
                        {msgUnread}
                      </span>
                    </button>
                  )}

                  {/* RPG & system notifications */}
                  {allNotifications.length === 0 && msgUnread === 0 ? (
                    <p className="px-4 py-8 text-sm text-gray-600 text-center">Sin notificaciones</p>
                  ) : (
                    allNotifications.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        className="flex items-start gap-3 px-4 py-3 border-b border-[#1A1A1A] last:border-0 hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center flex-shrink-0 text-base leading-none">
                          {n.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white leading-snug">{n.text}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{n.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>,
            document.body
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/5 transition-all"
          >
            <img
              src={getAvatarUrl(user?.avatar, user?.username ?? '')}
              alt={user?.username}
              className="w-7 h-7 rounded-full border border-elite-600/30"
            />
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-white leading-none">{user?.username}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Lv.{user?.level} · {user?.rank}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {mounted && userMenuOpen && createPortal(
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setUserMenuOpen(false)} />
              <div className="fixed top-14 md:top-16 right-3 md:right-6 w-48 bg-[#111111] border border-[#1E1E1E] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-[9999] overflow-hidden">
                <button
                  onClick={() => { router.push('/settings'); setUserMenuOpen(false) }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  <User size={15} /> Perfil
                </button>
                <button
                  onClick={() => { router.push('/settings'); setUserMenuOpen(false) }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Settings size={15} /> Configuración
                </button>
                <div className="border-t border-[#1E1E1E] mx-3" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/10 transition-all"
                >
                  <LogOut size={15} /> Cerrar Sesión
                </button>
              </div>
            </>,
            document.body
          )}
        </div>
      </div>
    </header>
  )
}
