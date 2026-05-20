import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface User {
  id: string
  username: string
  email: string
  avatar: string
  level: number
  xp: number
  rank: string
  streak: number
  longestStreak: number
  bio?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (data: { username: string; email: string; password: string; avatar?: string }) => Promise<boolean>
  logout: () => void
  updateUser: (data: Partial<User>) => void
  setToken: (token: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data } = await authApi.login({ email, password })
          const { token, user } = data
          localStorage.setItem('elite_token', token)
          set({ user, token, isAuthenticated: true, isLoading: false })
          toast.success(`Welcome back, ${user.username}!`)
          return true
        } catch (err: any) {
          set({ isLoading: false })
          const msg = err?.response?.data?.error || 'Login failed'
          toast.error(msg)
          return false
        }
      },

      register: async (formData) => {
        set({ isLoading: true })
        try {
          const { data } = await authApi.register(formData)
          const { token, user } = data
          localStorage.setItem('elite_token', token)
          set({ user, token, isAuthenticated: true, isLoading: false })
          toast.success(`Welcome to ELITE OS, ${user.username}!`)
          return true
        } catch (err: any) {
          set({ isLoading: false })
          const msg = err?.response?.data?.error || 'Registration failed'
          toast.error(msg)
          return false
        }
      },

      logout: () => {
        localStorage.removeItem('elite_token')
        set({ user: null, token: null, isAuthenticated: false })
        toast.success('Logged out successfully')
      },

      updateUser: (data) => {
        const current = get().user
        if (current) set({ user: { ...current, ...data } })
      },

      setToken: (token) => {
        localStorage.setItem('elite_token', token)
        set({ token })
      },
    }),
    {
      name: 'elite-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
