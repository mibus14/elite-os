'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ELITE OS Error]', error)
  }, [error])

  return (
    <html lang="es">
      <body style={{ background: '#0A0A0A', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: 400 }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Algo salió mal</h1>
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Ocurrió un error inesperado. Por favor intenta de nuevo.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#DC143C',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginRight: '0.75rem',
            }}
          >
            Intentar de nuevo
          </button>
          <button
            onClick={() => { window.location.href = '/login' }}
            style={{
              background: 'transparent',
              color: '#9CA3AF',
              border: '1px solid #333',
              borderRadius: '10px',
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Ir al inicio
          </button>
        </div>
      </body>
    </html>
  )
}
