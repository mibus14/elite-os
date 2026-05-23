import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const ACCENT_COLORS = [
  { id: 'red',    label: 'Rojo Elite', hex: '#DC143C', rgb: '220 20 60' },
  { id: 'blue',   label: 'Azul',       hex: '#3B82F6', rgb: '59 130 246' },
  { id: 'purple', label: 'Morado',     hex: '#8B5CF6', rgb: '139 92 246' },
  { id: 'green',  label: 'Verde',      hex: '#22C55E', rgb: '34 197 94' },
] as const

export type AccentId = typeof ACCENT_COLORS[number]['id']
export type ColorMode = 'dark' | 'light'

interface ThemeState {
  accentId: AccentId
  colorMode: ColorMode
  setAccent: (id: AccentId) => void
  setColorMode: (mode: ColorMode) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      accentId: 'red',
      colorMode: 'dark',
      setAccent: (id) => set({ accentId: id }),
      setColorMode: (mode) => set({ colorMode: mode }),
    }),
    {
      name: 'elite-theme',
      storage: {
        getItem: (key) => {
          try { return JSON.parse(localStorage.getItem(key) ?? 'null') } catch { return null }
        },
        setItem: (key, value) => {
          try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
        },
        removeItem: (key) => {
          try { localStorage.removeItem(key) } catch {}
        },
      },
    }
  )
)

export function getAccentColor(id: AccentId) {
  return ACCENT_COLORS.find((a) => a.id === id) ?? ACCENT_COLORS[0]
}
