import Cookies from 'js-cookie'

const TOKEN_KEY = 'elite_token'
const USER_KEY  = 'elite_user'

// ─── Token helpers ─────────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY) ?? Cookies.get(TOKEN_KEY) ?? null
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
  // Also set as httpOnly-like cookie (30 day expiry)
  Cookies.set(TOKEN_KEY, token, { expires: 30, sameSite: 'strict' })
}

export function removeToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  Cookies.remove(TOKEN_KEY)
}

// ─── Auth state ────────────────────────────────────────────────
export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) return false
  try {
    // Basic JWT expiry check (without verifying signature)
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      removeToken()
      return false
    }
    return true
  } catch {
    // Token is malformed — treat as valid and let backend reject
    return !!token
  }
}

// ─── User cache ────────────────────────────────────────────────
export interface CachedUser {
  id:       string
  username: string
  email:    string
  level:    number
  xp:       number
  rank:     string
  streak:   number
  avatar:   string
}

export function getCurrentUser(): CachedUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as CachedUser) : null
  } catch {
    return null
  }
}

export function setCurrentUser(user: CachedUser): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function removeCurrentUser(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(USER_KEY)
}

// ─── Full logout (clears both token and user) ──────────────────
export function clearSession(): void {
  removeToken()
  removeCurrentUser()
}
