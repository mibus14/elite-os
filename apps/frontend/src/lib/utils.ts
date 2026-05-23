import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatNumber(n: number, decimals = 0): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return n.toFixed(decimals)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function getRankColor(rank: string): string {
  const map: Record<string, string> = {
    Bronze: '#CD7F32', Silver: '#C0C0C0', Gold: '#FFD700',
    Platinum: '#67E8F9', Diamond: '#93C5FD',
  }
  return map[rank] ?? '#A0A0A0'
}

export function getXpProgress(xp: number, level: number) {
  const levelStart = (level - 1) * 500
  const levelEnd   = level * 500
  return Math.min(100, Math.max(0, ((xp - levelStart) / (levelEnd - levelStart)) * 100))
}

export function getMacroColor(macro: 'protein' | 'carbs' | 'fat'): string {
  return { protein: '#3B82F6', carbs: '#F59E0B', fat: '#EF4444' }[macro]
}

const AVATAR_SLUG_STYLE: Record<string, string> = {
  avatar_pixel: 'pixel-art',
  avatar_robot: 'bottts',
  avatar_dark:  'fun-emoji',
}

export function getAvatarUrl(avatar: string | null | undefined, username: string): string {
  if (!avatar) return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
  if (avatar.startsWith('http')) return avatar
  const style = AVATAR_SLUG_STYLE[avatar]
  if (style) return `https://api.dicebear.com/7.x/${style}/svg?seed=${username}`
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
}
