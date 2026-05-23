'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('[ELITE OS App Error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">⚡</div>
        <h1 className="text-2xl font-bold text-white mb-2">Error del Sistema</h1>
        <p className="text-gray-500 text-sm mb-6">
          Algo falló inesperadamente. Tu progreso está seguro.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-[#DC143C] text-white rounded-xl text-sm font-semibold hover:bg-[#B91C1C] transition-colors"
          >
            Reintentar
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
          >
            Ir al Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
