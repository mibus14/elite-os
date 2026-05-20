'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageCircle, Circle } from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import { messagesApi, usersApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

/* ─── Types ──────────────────────────────────────────────────────── */
interface ChatUser {
  id: string
  username: string
  avatar: string
  online: boolean
  lastMessage?: string
  lastMessageTime?: string
}

interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string
  read: boolean
}

/* ─── Mock Data ──────────────────────────────────────────────────── */
const mockUsers: ChatUser[] = [
  {
    id: '1',
    username: 'Diego',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=diego',
    online: true,
    lastMessage: 'Bro did you hit the gym today?',
    lastMessageTime: '2m ago',
  },
  {
    id: '2',
    username: 'Pedro',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pedro',
    online: false,
    lastMessage: 'I ran 7km this morning 🔥',
    lastMessageTime: '1h ago',
  },
  {
    id: '3',
    username: 'Cristopher',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cristopher',
    online: true,
    lastMessage: 'Let me know when you want to spar',
    lastMessageTime: '3h ago',
  },
]

const mockMessages: Record<string, Message[]> = {
  '1': [
    { id: '1', senderId: '1', receiverId: 'me', content: "Bro did you hit the gym today?", createdAt: '2026-05-20T10:00:00Z', read: true },
    { id: '2', senderId: 'me', receiverId: '1', content: "Yeah! Push day. Hit 82.5kg on bench 💪", createdAt: '2026-05-20T10:02:00Z', read: true },
    { id: '3', senderId: '1', receiverId: 'me', content: "LET'S GO! I did legs, absolutely destroyed 🦵", createdAt: '2026-05-20T10:03:00Z', read: true },
    { id: '4', senderId: 'me', receiverId: '1', content: "Keep pushing bro, we're getting those PRs 🏆", createdAt: '2026-05-20T10:05:00Z', read: true },
    { id: '5', senderId: '1', receiverId: 'me', content: "Bro did you hit the gym today?", createdAt: '2026-05-20T14:30:00Z', read: false },
  ],
  '2': [
    { id: '6', senderId: '2', receiverId: 'me', content: "I ran 7km this morning 🔥", createdAt: '2026-05-20T09:00:00Z', read: true },
    { id: '7', senderId: 'me', receiverId: '2', content: "Insane! What was your pace?", createdAt: '2026-05-20T09:30:00Z', read: true },
    { id: '8', senderId: '2', receiverId: 'me', content: "5:42/km. Getting faster every week", createdAt: '2026-05-20T09:32:00Z', read: true },
  ],
  '3': [
    { id: '9', senderId: '3', receiverId: 'me', content: "Let me know when you want to spar", createdAt: '2026-05-20T07:00:00Z', read: true },
    { id: '10', senderId: 'me', receiverId: '3', content: "This weekend works for me", createdAt: '2026-05-20T07:15:00Z', read: true },
  ],
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
  const [selectedUserId, setSelectedUserId] = useState<string>('1')
  const [inputValue, setInputValue] = useState('')
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>(mockMessages)
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const socketRef = useRef<Socket | null>(null)

  // Real Socket.io connection
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://192.168.1.74:3001', {
      auth: { token },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('message:received', (msg: Message) => {
      setLocalMessages((prev) => ({
        ...prev,
        [msg.senderId]: [...(prev[msg.senderId] ?? []), msg],
      }))
    })

    socket.on('users:online', (userIds: string[]) => {
      setOnlineUserIds(userIds)
    })

    return () => {
      socket.disconnect()
    }
  }, [token])

  const { data: usersData } = useQuery({
    queryKey: ['chat-users'],
    queryFn: async () => {
      const res = await usersApi.all()
      return res.data as ChatUser[]
    },
    placeholderData: mockUsers,
  })

  const { data: messagesData } = useQuery({
    queryKey: ['messages', selectedUserId],
    queryFn: async () => {
      const res = await messagesApi.conversation(selectedUserId)
      return res.data as Message[]
    },
    enabled: !!selectedUserId,
    placeholderData: mockMessages[selectedUserId] ?? [],
  })

  const sendMutation = useMutation({
    mutationFn: (data: object) => messagesApi.send(data),
  })

  const users = (usersData && usersData.length > 0 ? usersData : mockUsers)
    .filter((u) => u.id !== currentUser?.id)
    .map((u) => ({
      ...u,
      // Override online status with real socket data when available
      online: onlineUserIds.length > 0 ? onlineUserIds.includes(u.id) : u.online,
    }))

  const currentMessages = localMessages[selectedUserId] ?? messagesData ?? mockMessages[selectedUserId] ?? []
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
      senderId: currentUser?.id ?? 'me',
      receiverId: selectedUserId,
      content,
      createdAt: new Date().toISOString(),
      read: false,
    }

    // Emit via socket for real-time delivery
    socketRef.current?.emit('message:send', {
      receiverId: selectedUserId,
      content,
      senderId: currentUser?.id ?? 'me',
      createdAt: newMsg.createdAt,
    })

    // Persist via REST API
    sendMutation.mutate({ receiverId: selectedUserId, content })

    // Optimistic local update
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

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0 overflow-hidden rounded-2xl border border-[#1E1E1E]">
      {/* LEFT: User list */}
      <div className="w-64 flex-shrink-0 bg-[#111111] border-r border-[#1E1E1E] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#1E1E1E]">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#DC143C]" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Mensajes</h2>
          </div>
        </div>

        {/* Users */}
        <div className="flex-1 overflow-y-auto">
          {users.map((user, idx) => (
            <motion.button
              key={user.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.07 }}
              onClick={() => setSelectedUserId(user.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all text-left border-l-2 ${
                selectedUserId === user.id
                  ? 'bg-[#DC143C]/10 border-l-[#DC143C]'
                  : 'border-l-transparent hover:bg-white/5'
              }`}
            >
              {/* Avatar + online dot */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1E1E1E] border border-white/10">
                  <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                </div>
                <div
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#111111] ${
                    user.online ? 'bg-emerald-400' : 'bg-gray-600'
                  }`}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{user.username}</span>
                  {user.lastMessageTime && (
                    <span className="text-[10px] text-gray-600">{user.lastMessageTime}</span>
                  )}
                </div>
                {user.lastMessage && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{user.lastMessage}</p>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* RIGHT: Chat area */}
      <div className="flex-1 bg-[#0A0A0A] flex flex-col">
        {selectedUser ? (
          <>
            {/* Top bar */}
            <div className="px-5 py-4 border-b border-[#1E1E1E] bg-[#111111] flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-[#1E1E1E]">
                  <img src={selectedUser.avatar} alt={selectedUser.username} className="w-full h-full object-cover" />
                </div>
                <div
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#111111] ${
                    selectedUser.online ? 'bg-emerald-400' : 'bg-gray-600'
                  }`}
                />
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {currentMessages.map((msg) => {
                  const isSelf = msg.senderId === (currentUser?.id ?? 'me') || msg.senderId === 'me'
                  return <MessageBubble key={msg.id} msg={msg} isSelf={isSelf} />
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[#1E1E1E] bg-[#111111]">
              <div className="flex gap-3 items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Escribe un mensaje a ${selectedUser.username}…`}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#DC143C] transition-colors"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="w-10 h-10 rounded-xl bg-[#DC143C] hover:bg-[#C01230] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 transition-colors shadow-[0_0_12px_rgba(220,20,60,0.3)]"
                >
                  <Send className="w-4 h-4 text-white" />
                </motion.button>
              </div>
              <p className="text-[10px] text-gray-700 mt-1.5 ml-1">Presiona Enter para enviar</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Selecciona una conversación</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
