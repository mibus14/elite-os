'use client'

import { useEffect } from 'react'
import { useThemeStore, getAccentColor } from '@/store/themeStore'

export function AccentApplier() {
  const accentId  = useThemeStore((s) => s.accentId)
  const colorMode = useThemeStore((s) => s.colorMode)

  useEffect(() => {
    const accent = getAccentColor(accentId)
    const root = document.documentElement
    root.style.setProperty('--accent-rgb', accent.rgb)
    root.style.setProperty('--elite-primary', accent.hex)
    root.style.setProperty('--elite-neon', accent.hex)
  }, [accentId])

  useEffect(() => {
    const html = document.documentElement
    if (colorMode === 'light') {
      html.classList.add('light-mode')
    } else {
      html.classList.remove('light-mode')
    }
  }, [colorMode])

  return null
}
