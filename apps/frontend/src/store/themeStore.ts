import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const ACCENT_COLORS = [
  { id: 'red',    label: 'Rojo Elite', hex: '#DC143C', rgb: '220 20 60' },
  { id: 'blue',   label: 'Azul',       hex: '#3B82F6', rgb: '59 130 246' },
  { id: 'purple', label: 'Morado',     hex: '#8B5CF6', rgb: '139 92 246' },
  { id: 'green',  label: 'Verde',      hex: '#22C55E', rgb: '34 197 94' },
] as const

export type AccentId = typeof ACCENT_COLORS[number]['id']

interface ThemeState {
  accentId: AccentId
  setAccent: (id: AccentId) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      accentId: 'red',
      setAccent: (id) => set({ accentId: id }),
    }),
    { name: 'elite-theme' }
  )
)

export function getAccentColor(id: AccentId) {
  return ACCENT_COLORS.find((a) => a.id === id) ?? ACCENT_COLORS[0]
}
