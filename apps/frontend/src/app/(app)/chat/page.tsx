'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, MessageCircle, Search, Check, CheckCheck, ArrowLeft, Users,
} from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import { messagesApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

/* ─── Types ──────────────────────────────────────────────────────── */
interface ConvUser { id: string; username: string; avatar: string; level: number; rank: string; online: boolean }
interface LastMsg  { id: string; content: string; createdAt: string; senderId: string; read: boolean }
interface Conversation { user: ConvUser; lastMessage: LastMsg | null; unreadCount: number }

interface Message {
  id: string; senderId: string; receiverId: string
  content: string; createdAt: string; read: boolean
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function avatar(src: string | null | undefined, username: string) {
  return src || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'ahora'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  const d = new Date(iso)
  if (diff < 86_400_000) return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (diff < 7 * 86_400_000) return d.toLocaleDateString('es-MX', { weekday: 'short' })
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function exactTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function msgDayStr(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dayLabel(dayStr: string) {
  const today     = msgDayStr(new Date().toISOString())
  const yesterday = msgDayStr(new Date(Date.now() - 86_400_000).toISOString())
  if (dayStr === today)     return 'Hoy'
  if (dayStr === yesterday) return 'Ayer'
  const d = new Date(dayStr + 'T12:00:00')
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

function groupByDay(msgs: Message[]) {
  const map = new Map<string, Message[]>()
  for (const m of msgs) {
    const k = msgDayStr(m.createdAt)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(m)
  }
  return Array.from(map.entries()).map(([dayStr, messages]) => ({ dayStr, label: dayLabel(dayStr), messages }))
}

/* ─── Conversation item ──────────────────────────────────────────── */
function ConvItem({ conv, isSelected, myId, onClick }: {
  conv: Conversation; isSelected: boolean; myId: string; onClick: () => void
}) {
  const { user, lastMessage: lm, unreadCount } = conv
  const isMine = lm?.senderId === myId

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all border-l-2 text-left ${
        isSelected ? 'bg-[#DC143C]/10 border-l-[#DC143C]' : 'border-l-transparent hover:bg-white/[0.03]'
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <img
          src={avatar(user.avatar, user.username)}
          alt={user.username}
          className="w-11 h-11 rounded-full object-cover bg-[#1E1E1E]"
        />
        <div className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#111111] ${
          user.online ? 'bg-emerald-400' : 'bg-[#333]'
        }`} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span className={`text-sm truncate ${unreadCount > 0 ? 'font-bold text-white' : 'font-medium text-gray-300'}`}>
            {user.username}
          </span>
          {lm && (
            <span className={`text-[10px] flex-shrink-0 tabular-nums ${unreadCount > 0 ? 'text-[#DC143C]' : 'text-gray-600'}`}>
              {relativeTime(lm.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isMine && !unreadCount && <CheckCheck className="w-3 h-3 flex-shrink-0 text-gray-600" />}
          <span className={`text-xs truncate flex-1 ${unreadCount > 0 ? 'text-gray-200' : 'text-gray-600'}`}>
            {lm ? (isMine ? lm.content : lm.content) : 'Inicia la conversación'}
          </span>
          {unreadCount > 0 && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-[#DC143C] text-white text-[10px] font-bold flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

/* ─── Message bubble ─────────────────────────────────────────────── */
function Bubble({ msg, isSelf, showAvatar, userAvatar, username, isLastInGroup }: {
  msg: Message; isSelf: boolean; showAvatar: boolean
  userAvatar: string; username: string; isLastInGroup: boolean
}) {
  return (
    <div className={`flex gap-2 items-end ${isSelf ? 'flex-row-reverse' : ''}`}>
      {/* Avatar placeholder (keeps alignment) */}
      {!isSelf && (
        <div className="w-6 flex-shrink-0 self-end mb-1">
          {showAvatar && (
            <img src={userAvatar} alt={username} className="w-6 h-6 rounded-full object-cover" />
          )}
        </div>
      )}

      <div className={`max-w-[72%] flex flex-col gap-0.5 ${isSelf ? 'items-end' : 'items-start'}`}>
        <div className={`px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap ${
          isSelf
            ? `bg-[#DC143C] text-white shadow-[0_2px_12px_rgba(220,20,60,0.25)] ${
                isLastInGroup ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl'
              }`
            : `bg-[#1E1E1E] text-gray-100 ${
                showAvatar ? 'rounded-2xl rounded-bl-sm' : 'rounded-2xl'
              }`
        }`}>
          {msg.content}
        </div>
        {isLastInGroup && (
          <div className={`flex items-center gap-1 px-1 ${isSelf ? 'flex-row-reverse' : ''}`}>
            <span className="text-[10px] text-gray-600 tabular-nums">{exactTime(msg.createdAt)}</span>
            {isSelf && (
              msg.read
                ? <CheckCheck className="w-3 h-3 text-[#DC143C]" />
                : <Check className="w-3 h-3 text-gray-600" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Typing indicator ───────────────────────────────────────────── */
function TypingIndicator({ userAvatar, username }: { userAvatar: string; username: string }) {
  return (
    <div className="flex gap-2 items-end">
      <img src={userAvatar} alt={username} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
      <div className="bg-[#1E1E1E] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gray-500"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
          />
        ))}
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function ChatPage() {
  const currentUser = useAuthStore((s) => s.user)
  const token       = useAuthStore((s) => s.token)
  const qc          = useQueryClient()

  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [mobileView, setMobileView]   = useState<'list' | 'chat'>('list')
  const [inputValue, setInputValue]   = useState('')
  const [search, setSearch]           = useState('')
  const [localMsgs, setLocalMsgs]     = useState<Record<string, Message[]>>({})
  const [onlineIds, setOnlineIds]     = useState<string[]>([])
  const [typingFrom, setTypingFrom]   = useState<Set<string>>(new Set())

  const bottomRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)
  const socketRef   = useRef<Socket | null>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Socket ── */
  useEffect(() => {
    if (!token) return
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const socket = io(url, { auth: { token }, transports: ['polling', 'websocket'], reconnectionAttempts: 2, timeout: 6000 })
    socketRef.current = socket

    socket.on('connect_error', () => {})

    socket.on('message:received', (msg: Message) => {
      setLocalMsgs((prev) => ({ ...prev, [msg.senderId]: [...(prev[msg.senderId] ?? []), msg] }))
      qc.invalidateQueries({ queryKey: ['conversations'] })
    })

    socket.on('message:read_ack', ({ readBy }: { readBy: string }) => {
      setLocalMsgs((prev) => {
        const msgs = prev[readBy]
        if (!msgs) return prev
        return { ...prev, [readBy]: msgs.map((m) => ({ ...m, read: true })) }
      })
    })

    socket.on('users:online', (ids: string[]) => setOnlineIds(ids))

    socket.on('typing:start', ({ from }: { from: string }) => {
      setTypingFrom((prev) => new Set(prev).add(from))
    })
    socket.on('typing:stop', ({ from }: { from: string }) => {
      setTypingFrom((prev) => { const s = new Set(prev); s.delete(from); return s })
    })

    return () => { socket.disconnect() }
  }, [token, qc])

  /* ── Conversations (sidebar) ── */
  const { data: convData } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => (await messagesApi.conversations()).data as { conversations: Conversation[]; totalUnread: number },
    refetchInterval: 8_000,
  })

  const rawConversations = convData?.conversations ?? []
  const conversations = rawConversations.map((c) => ({
    ...c,
    user: { ...c.user, online: onlineIds.includes(c.user.id) },
  }))

  const filtered = search.trim()
    ? conversations.filter((c) => c.user.username.toLowerCase().includes(search.toLowerCase()))
    : conversations

  /* ── Messages ── */
  const { data: msgsData } = useQuery({
    queryKey: ['messages', selectedId],
    queryFn: async () => (await messagesApi.conversation(selectedId!)).data.messages as Message[],
    enabled: !!selectedId,
    refetchInterval: 6_000,
  })

  useEffect(() => {
    if (msgsData && selectedId) {
      setLocalMsgs((prev) => ({ ...prev, [selectedId]: msgsData }))
      // Notify sender their messages are read
      msgsData
        .filter((m) => !m.read && m.senderId !== currentUser?.id)
        .forEach((m) => socketRef.current?.emit('message:read', { messageId: m.id, senderId: m.senderId }))
      // Refresh conversation list to update unread badge
      qc.invalidateQueries({ queryKey: ['conversations'] })
    }
  }, [msgsData, selectedId, currentUser?.id, qc])

  // Auto-select first on desktop
  useEffect(() => {
    if (conversations.length > 0 && !selectedId && typeof window !== 'undefined' && window.innerWidth >= 768) {
      setSelectedId(conversations[0].user.id)
    }
  }, [conversations.length]) // eslint-disable-line

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMsgs[selectedId ?? '']?.length, selectedId])

  /* ── Send ── */
  const sendMutation = useMutation({
    mutationFn: (data: object) => messagesApi.send(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', selectedId] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  const handleSend = useCallback(() => {
    const content = inputValue.trim()
    if (!content || !selectedId) return

    const newMsg: Message = {
      id: `local-${Date.now()}`,
      senderId: currentUser?.id ?? '',
      receiverId: selectedId,
      content,
      createdAt: new Date().toISOString(),
      read: false,
    }

    socketRef.current?.emit('message:send', { receiverId: selectedId, content, senderId: currentUser?.id, createdAt: newMsg.createdAt })
    socketRef.current?.emit('typing:stop', { to: selectedId })

    sendMutation.mutate({ receiverId: selectedId, content })
    setLocalMsgs((prev) => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), newMsg] }))
    setInputValue('')

    // Reset textarea height
    if (inputRef.current) { inputRef.current.style.height = 'auto' }
    inputRef.current?.focus()
  }, [inputValue, selectedId, currentUser?.id, sendMutation])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
    // Typing events
    if (!selectedId) return
    socketRef.current?.emit('typing:start', { to: selectedId })
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit('typing:stop', { to: selectedId })
    }, 2000)
  }

  const handleSelectUser = (userId: string) => {
    setSelectedId(userId)
    setMobileView('chat')
    setInputValue('')
    inputRef.current?.focus()
  }

  const currentMessages = localMsgs[selectedId ?? ''] ?? []
  const selectedConv    = conversations.find((c) => c.user.id === selectedId)
  const selectedUser    = selectedConv?.user
  const dayGroups       = groupByDay(currentMessages)
  const isTyping        = selectedId ? typingFrom.has(selectedId) : false

  /* ── Left panel ── */
  const LeftPanel = (
    <div className="flex flex-col h-full bg-[#0F0F0F] border-r border-[#1A1A1A]">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[#1A1A1A]">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <MessageCircle className="w-4 h-4 text-[#DC143C]" />
          Mensajes
          {(convData?.totalUnread ?? 0) > 0 && (
            <span className="ml-auto text-xs bg-[#DC143C] text-white px-2 py-0.5 rounded-full font-bold">
              {convData!.totalUnread}
            </span>
          )}
        </h2>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#DC143C]/40 transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
            <Users className="w-8 h-8 opacity-20" />
            <p className="text-xs">{search ? 'Sin resultados' : 'Sin conversaciones'}</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((conv, idx) => (
              <motion.div
                key={conv.user.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <ConvItem
                  conv={conv}
                  isSelected={selectedId === conv.user.id}
                  myId={currentUser?.id ?? ''}
                  onClick={() => handleSelectUser(conv.user.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )

  /* ── Right panel ── */
  const RightPanel = (
    <div className="flex-1 bg-[#0A0A0A] flex flex-col min-w-0">
      {selectedUser ? (
        <>
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1A1A1A] bg-[#0F0F0F] flex-shrink-0">
            <button
              onClick={() => setMobileView('list')}
              className="md:hidden p-2 -ml-1 rounded-xl text-gray-500 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="relative flex-shrink-0">
              <img
                src={avatar(selectedUser.avatar, selectedUser.username)}
                alt={selectedUser.username}
                className="w-9 h-9 rounded-full object-cover bg-[#1E1E1E]"
              />
              <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#0F0F0F] ${
                selectedUser.online ? 'bg-emerald-400' : 'bg-[#333]'
              }`} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-none">{selectedUser.username}</p>
              <p className={`text-[10px] mt-0.5 ${isTyping ? 'text-[#DC143C]' : selectedUser.online ? 'text-emerald-400' : 'text-gray-600'}`}>
                {isTyping ? 'escribiendo...' : selectedUser.online ? 'En línea' : `Lv.${selectedUser.level} · ${selectedUser.rank}`}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {currentMessages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center h-full">
                <p className="text-xs text-gray-700 text-center">
                  Empieza la conversación con {selectedUser.username}
                </p>
              </div>
            ) : (
              dayGroups.map(({ dayStr, label, messages }) => (
                <div key={dayStr} className="space-y-1">
                  {/* Day separator */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-white/[0.06]" />
                    <span className="text-[10px] text-gray-600 font-medium px-2">{label}</span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>

                  {/* Bubbles */}
                  <div className="space-y-0.5">
                    {messages.map((msg, i) => {
                      const isSelf = msg.senderId === currentUser?.id
                      const prev   = i > 0 ? messages[i - 1] : null
                      const next   = i < messages.length - 1 ? messages[i + 1] : null
                      const isFirst = !prev || prev.senderId !== msg.senderId
                      const isLast  = !next || next.senderId !== msg.senderId
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className={isFirst ? 'mt-2' : ''}
                        >
                          <Bubble
                            msg={msg}
                            isSelf={isSelf}
                            showAvatar={!isSelf && isFirst}
                            userAvatar={avatar(selectedUser.avatar, selectedUser.username)}
                            username={selectedUser.username}
                            isLastInGroup={isLast}
                          />
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}

            {/* Typing indicator */}
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                >
                  <TypingIndicator
                    userAvatar={avatar(selectedUser.avatar, selectedUser.username)}
                    username={selectedUser.username}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-[#1A1A1A] bg-[#0F0F0F] flex-shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Mensaje a ${selectedUser.username}…`}
                className="flex-1 min-w-0 resize-none bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#DC143C]/50 transition-colors leading-relaxed overflow-hidden"
                style={{ maxHeight: 100 }}
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  inputValue.trim()
                    ? 'bg-[#DC143C] shadow-[0_0_16px_rgba(220,20,60,0.4)]'
                    : 'bg-white/5 text-gray-600'
                }`}
              >
                <Send className="w-4 h-4 text-white" />
              </motion.button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto">
              <MessageCircle className="w-7 h-7 text-gray-700" />
            </div>
            <p className="text-sm text-gray-600">Selecciona una conversación</p>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex h-[calc(100dvh-116px)] md:h-[calc(100dvh-112px)] overflow-hidden rounded-2xl border border-[#1A1A1A]">
      <div className={`w-72 flex-shrink-0 md:flex ${mobileView === 'list' ? 'flex w-full md:w-72' : 'hidden md:flex'}`}>
        {LeftPanel}
      </div>
      <div className={`flex-1 md:flex min-w-0 ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}`}>
        {RightPanel}
      </div>
    </div>
  )
}
