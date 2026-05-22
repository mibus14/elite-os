'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
            throwOnError: false,
          },
          mutations: {
            throwOnError: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#111111',
            color: '#FFFFFF',
            border: '1px solid #1E1E1E',
            borderRadius: '10px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.875rem',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          },
          success: {
            iconTheme: { primary: '#22C55E', secondary: '#0A0A0A' },
            style: { borderColor: 'rgba(34,197,94,0.25)' },
          },
          error: {
            iconTheme: { primary: '#DC143C', secondary: '#0A0A0A' },
            style: { borderColor: 'rgba(220,20,60,0.25)' },
          },
        }}
      />
    </QueryClientProvider>
  )
}
