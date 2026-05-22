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
          const msg =
            err?.response?.data?.error ||
            err?.response?.data?.errors?.[0]?.msg ||
            (err?.code === 'ERR_NETWORK' ? 'No se puede conectar al servidor. Verifica tu conexión.' : null) ||
            'Email o contraseña incorrectos.'
          throw new Error(msg)
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
          const msg =
            err?.response?.data?.error ||
            err?.response?.data?.errors?.[0]?.msg ||
            (err?.code === 'ERR_NETWORK' ? 'No se puede conectar al servidor. Verifica tu conexión.' : null) ||
            'Error al registrarse. Intenta de nuevo.'
          throw new Error(msg)
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
