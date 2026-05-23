'use client'

import { useEffect } from 'react'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ELITE OS Auth Error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🛡️</div>
        <h1 className="text-2xl font-bold text-white mb-2">Error de autenticación</h1>
        <p className="text-gray-500 text-sm mb-6">
          Ocurrió un problema al cargar la página. Intenta de nuevo.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-[#DC143C] text-white rounded-xl text-sm font-semibold"
          >
            Reintentar
          </button>
          <button
            onClick={() => { window.location.href = '/login' }}
            className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl text-sm font-semibold"
          >
            Ir al Login
          </button>
        </div>
      </div>
    </div>
  )
}
