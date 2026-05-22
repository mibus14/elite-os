'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageCircle, Circle, Users } from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import { messagesApi, usersApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

/* ─── Types ──────────────────────────────────────────────────────── */
interface ChatUser {
  id: string
  username: string
  avatar: string
  online: boolean
  level?: number
  rank?: string
}

interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string
  read: boolean
}

/* ─── Format time ────────────────────────────────────────────────── */
function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

/* ─── Message bubble ─────────────────────────────────────────────── */
function MessageBubble({ msg, isSelf }: { msg: Message; isSelf: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`flex flex-col max-w-[70%] gap-1 ${isSelf ? 'self-end items-end' : 'self-start items-start'}`}
    >
      <div
        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isSelf
            ? 'bg-[#DC143C] text-white rounded-br-md shadow-[0_0_12px_rgba(220,20,60,0.3)]'
            : 'bg-[#1E1E1E] text-gray-100 rounded-bl-md'
        }`}
      >
        {msg.content}
      </div>
      <span className="text-[10px] text-gray-600 px-1">{formatTime(msg.createdAt)}</span>
    </motion.div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function ChatPage() {
  const currentUser = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const queryClient = useQueryClient()

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const [inputValue, setInputValue] = useState('')
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>({})
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const socketRef = useRef<Socket | null>(null)

  // Socket.io connection — fail fast on Vercel (no persistent WebSockets)
  useEffect(() => {
    if (!token) return
    const backendUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const socket = io(backendUrl, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 1,
      timeout: 6000,
    })
    socketRef.current = socket

    socket.on('connect_error', () => { /* non-fatal on Vercel */ })

    socket.on('message:received', (msg: Message) => {
      setLocalMessages((prev) => ({
        ...prev,
        [msg.senderId]: [...(prev[msg.senderId] ?? []), msg],
      }))
    })

    socket.on('users:online', (userIds: string[]) => {
      setOnlineUserIds(userIds)
    })

    return () => { socket.disconnect() }
  }, [token])

  // Load all users (excluding self)
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['chat-users'],
    queryFn: async () => {
      const res = await usersApi.all()
      const all = (res.data.users ?? []) as ChatUser[]
      return all.filter((u) => u.id !== currentUser?.id)
    },
  })

  // Auto-select first user on desktop once loaded
  useEffect(() => {
    if (usersData && usersData.length > 0 && !selectedUserId) {
      if (window.innerWidth >= 768) setSelectedUserId(usersData[0].id)
    }
  }, [usersData, selectedUserId])

  // Load conversation messages
  const { data: messagesData } = useQuery({
    queryKey: ['messages', selectedUserId],
    queryFn: async () => {
      const res = await messagesApi.conversation(selectedUserId!)
      return (res.data.messages ?? []) as Message[]
    },
    enabled: !!selectedUserId,
  })

  // Sync fetched messages into localMessages
  useEffect(() => {
    if (messagesData && selectedUserId) {
      setLocalMessages((prev) => ({ ...prev, [selectedUserId]: messagesData }))
    }
  }, [messagesData, selectedUserId])

  const sendMutation = useMutation({
    mutationFn: (data: object) => messagesApi.send(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedUserId] })
    },
  })

  const users = (usersData ?? []).map((u) => ({
    ...u,
    online: onlineUserIds.length > 0 ? onlineUserIds.includes(u.id) : false,
  }))

  const currentMessages = localMessages[selectedUserId ?? ''] ?? []
  const selectedUser = users.find((u) => u.id === selectedUserId)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages.length, selectedUserId])

  const handleSend = () => {
    const content = inputValue.trim()
    if (!content || !selectedUserId) return

    const newMsg: Message = {
      id: String(Date.now()),
      senderId: currentUser?.id ?? '',
      receiverId: selectedUserId,
      content,
      createdAt: new Date().toISOString(),
      read: false,
    }

    socketRef.current?.emit('message:send', {
      receiverId: selectedUserId,
      content,
      senderId: currentUser?.id,
      createdAt: newMsg.createdAt,
    })

    sendMutation.mutate({ receiverId: selectedUserId, content })

    setLocalMessages((prev) => ({
      ...prev,
      [selectedUserId]: [...(prev[selectedUserId] ?? []), newMsg],
    }))
    setInputValue('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /* ── User list panel ── */
  const UserListPanel = (
    <div className="flex flex-col h-full bg-[#111111] border-r border-[#1E1E1E]">
      <div className="p-4 border-b border-[#1E1E1E] flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-[#DC143C]" />
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex-1">Mensajes</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {usersLoading && (
          <div className="p-4 text-center text-xs text-gray-600">Cargando operadores...</div>
        )}
        {!usersLoading && users.length === 0 && (
          <div className="p-6 text-center">
            <Users className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-xs text-gray-600">No hay otros operadores registrados todavía.</p>
          </div>
        )}
        {users.map((user, idx) => (
          <motion.button
            key={user.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.07 }}
            onClick={() => { setSelectedUserId(user.id); setMobileView('chat') }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all text-left border-l-2 ${
              selectedUserId === user.id
                ? 'bg-[#DC143C]/10 border-l-[#DC143C]'
                : 'border-l-transparent hover:bg-white/5'
            }`}
          >
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1E1E1E] border border-white/10">
                <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt={user.username} className="w-full h-full object-cover" />
              </div>
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#111111] ${user.online ? 'bg-emerald-400' : 'bg-gray-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-white block truncate">{user.username}</span>
              {user.rank && <span className="text-[10px] text-gray-500">Lv.{user.level} · {user.rank}</span>}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )

  /* ── Chat panel ── */
  const ChatPanel = (
    <div className="flex-1 bg-[#0A0A0A] flex flex-col min-w-0">
      {selectedUser ? (
        <>
          <div className="px-4 py-3 border-b border-[#1E1E1E] bg-[#111111] flex items-center gap-3">
            {/* Back button (mobile only) */}
            <button
              onClick={() => setMobileView('list')}
              className="md:hidden p-1 rounded-lg text-gray-400 hover:text-white transition-colors mr-1"
            >
              ←
            </button>
            <div className="relative">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-[#1E1E1E]">
                <img src={selectedUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.username}`} alt={selectedUser.username} className="w-full h-full object-cover" />
              </div>
              <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#111111] ${selectedUser.online ? 'bg-emerald-400' : 'bg-gray-600'}`} />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{selectedUser.username}</p>
              <div className="flex items-center gap-1.5">
                <Circle className={`w-2 h-2 fill-current ${selectedUser.online ? 'text-emerald-400' : 'text-gray-600'}`} />
                <span className={`text-xs ${selectedUser.online ? 'text-emerald-400' : 'text-gray-600'}`}>
                  {selectedUser.online ? 'En línea' : 'Desconectado'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {currentMessages.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-gray-700">Empieza la conversación con {selectedUser.username} 👊</p>
              </div>
            )}
            <AnimatePresence initial={false}>
              {currentMessages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} isSelf={msg.senderId === currentUser?.id} />
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-[#1E1E1E] bg-[#111111]">
            <div className="flex gap-2 items-center min-w-0">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Escribe a ${selectedUser.username}…`}
                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#DC143C] transition-colors"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="w-10 h-10 rounded-xl bg-[#DC143C] disabled:opacity-40 flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <Send className="w-4 h-4 text-white" />
              </motion.button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-600">
          <div className="text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{users.length === 0 ? 'Esperando que otros operadores se registren...' : 'Selecciona una conversación'}</p>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex h-[calc(100dvh-130px)] md:h-[calc(100vh-120px)] overflow-hidden rounded-2xl border border-[#1E1E1E]">
      {/* Desktop: side-by-side | Mobile: toggle between list/chat */}
      <div className={`w-64 flex-shrink-0 md:flex ${mobileView === 'list' ? 'flex w-full md:w-64' : 'hidden md:flex'}`}>
        {UserListPanel}
      </div>
      <div className={`flex-1 md:flex ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}`}>
        {ChatPanel}
      </div>
    </div>
  )
}
