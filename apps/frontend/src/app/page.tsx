'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/dashboard')
    } else {
      router.replace('/login')
    }
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
      <div className="flex flex-col items-center gap-4">
        {/* Animated ELITE OS logo while redirecting */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-elite-600 opacity-30 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-elite-neon opacity-50 animate-spin-slow" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-2xl font-bold text-elite-600"
              style={{ fontFamily: 'Space Grotesk, sans-serif', textShadow: '0 0 20px rgba(220,20,60,0.6)' }}
            >
              E
            </span>
          </div>
        </div>
        <p className="text-dark-100 text-sm tracking-widest uppercase">Loading ELITE OS...</p>
      </div>
    </div>
  )
}
