'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

interface LoginCredentials {
  email:    string
  password: string
}

interface RegisterData {
  username: string
  email:    string
  password: string
  avatar?:  string
}

export function useAuth() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const store = useAuthStore()

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setIsLoading(true)
      setError(null)
      try {
        const success = await store.login(credentials.email, credentials.password)
        if (success) {
          router.replace('/dashboard')
        } else {
          setError('Invalid email or password.')
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Login failed. Please try again.'
        setError(msg)
      } finally {
        setIsLoading(false)
      }
    },
    [store, router]
  )

  const register = useCallback(
    async (data: RegisterData) => {
      setIsLoading(true)
      setError(null)
      try {
        const success = await store.register(data)
        if (success) {
          router.replace('/dashboard')
        } else {
          setError('Registration failed. Please try again.')
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.'
        setError(msg)
      } finally {
        setIsLoading(false)
      }
    },
    [store, router]
  )

  const logout = useCallback(() => {
    store.logout()
    router.replace('/login')
  }, [store, router])

  return {
    user:            store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    updateUser:      store.updateUser,
    clearError:      () => setError(null),
  }
}
