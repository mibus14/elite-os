'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import * as Tabs from '@radix-ui/react-tabs'
import { Settings, User, Bell, Monitor, Shield, Check, Eye, EyeOff, AlertTriangle, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, shopApi } from '@/lib/api'
import { usersApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore, ACCENT_COLORS, type AccentId } from '@/store/themeStore'
import { getAvatarUrl } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

/* ─── Default avatar presets ─────────────────────────────────── */
const DEFAULT_AVATARS = [
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=felix',   label: 'Felix' },
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',    label: 'Alex' },
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sam',     label: 'Sam' },
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jordan',  label: 'Jordan' },
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=taylor',  label: 'Taylor' },
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=casey',   label: 'Casey' },
]

const SHOP_AVATAR_SLUGS = ['avatar_pixel', 'avatar_robot', 'avatar_dark', 'avatar_warrior', 'avatar_sage', 'avatar_noble', 'avatar_phantom', 'avatar_god']
const SHOP_AVATAR_META: Record<string, { icon: string; label: string; rarity: string }> = {
  avatar_pixel:   { icon: '👾', label: 'Pixel',    rarity: 'common' },
  avatar_robot:   { icon: '🤖', label: 'Robot',    rarity: 'rare' },
  avatar_dark:    { icon: '😈', label: 'Oscuro',   rarity: 'epic' },
  avatar_warrior: { icon: '⚔️', label: 'Guerrero', rarity: 'rare' },
  avatar_sage:    { icon: '🧙', label: 'Sabio',    rarity: 'epic' },
  avatar_noble:   { icon: '👑', label: 'Noble',    rarity: 'legendary' },
  avatar_phantom: { icon: '👻', label: 'Fantasma', rarity: 'legendary' },
  avatar_god:     { icon: '✨', label: 'Dios',     rarity: 'legendary' },
}
const RARITY_COLOR: Record<string, string> = {
  common:    'border-gray-500/50 text-gray-400',
  rare:      'border-blue-500/50 text-blue-400',
  epic:      'border-purple-500/50 text-purple-400',
  legendary: 'border-yellow-400/50 text-yellow-400',
}

/* ─── Toggle Switch ──────────────────────────────────────────── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <motion.button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        checked ? 'bg-elite-600' : 'bg-white/10'
      }`}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
      />
    </motion.button>
  )
}

function NotifRow({ label, description, value, onChange }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[#1E1E1E] last:border-0">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-gray-500 text-xs mt-0.5">{description}</p>
      </div>
      <Toggle checked={value} onChange={onChange} />
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function SettingsPage() {
  const user        = useAuthStore((s) => s.user)
  const updateUser  = useAuthStore((s) => s.updateUser)
  const logout      = useAuthStore((s) => s.logout)
  const queryClient = useQueryClient()

  const { accentId, setAccent, colorMode, setColorMode } = useThemeStore()

  // Profile state
  const [username, setUsername] = useState(user?.username ?? '')
  const [bio, setBio]           = useState(user?.bio ?? '')
  const [saved, setSaved]       = useState(false)

  // Appearance — avatar
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null)
  const currentAvatar = getAvatarUrl(user?.avatar, user?.username ?? '')
  const displayAvatar = pendingAvatar ?? currentAvatar

  // Notifications
  const [notifs, setNotifs] = useState({
    emailNotifications: true, achievementAlerts: true,
    weeklyReport: false, goalReminders: true,
  })

  // Security
  const [pwForm, setPwForm]   = useState({ current: '', newPw: '', confirm: '' })
  const [showPw, setShowPw]   = useState({ current: false, newPw: false, confirm: false })
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  // Delete account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword]   = useState('')
  const [deleteError, setDeleteError]         = useState('')

  /* ── Inventory (shop avatar skins) ─────────────────────────── */
  const { data: inventoryData } = useQuery({
    queryKey: ['shop-inventory'],
    queryFn:  () => shopApi.inventory().then((r) => r.data),
    staleTime: 60_000,
    retry: false,
  })
  const ownedAvatarSlugs: string[] = (inventoryData?.items ?? [])
    .filter((i: any) => SHOP_AVATAR_SLUGS.includes(i.slug))
    .map((i: any) => i.slug)

  /* ── Mutations ─────────────────────────────────────────────── */
  const deleteAccountMutation = useMutation({
    mutationFn: (password: string) => usersApi.deleteAccount(password),
    onSuccess: () => { toast.success('Cuenta eliminada'); logout() },
    onError:   (err: any) => setDeleteError(err?.response?.data?.error || 'Error al eliminar la cuenta'),
  })

  const updateProfileMutation = useMutation({
    mutationFn: (data: { username?: string; bio?: string }) => api.put('/users/profile', data),
    onSuccess: (res) => {
      updateUser(res.data.user ?? { username, bio })
      queryClient.invalidateQueries({ queryKey: ['rpg-character'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      toast.success('¡Perfil actualizado!')
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Error al guardar'),
  })

  const saveAvatarMutation = useMutation({
    mutationFn: async (avatar: string) => {
      if (avatar.startsWith('http')) {
        return api.put('/users/profile', { avatar })
      }
      return shopApi.equip(avatar)
    },
    onSuccess: (res, avatar) => {
      const newAvatar = res.data?.user?.avatar ?? res.data?.newValue ?? avatar
      updateUser({ avatar: newAvatar })
      queryClient.invalidateQueries({ queryKey: ['rpg-character'] })
      queryClient.invalidateQueries({ queryKey: ['shop-inventory'] })
      setPendingAvatar(null)
      toast.success('¡Avatar actualizado!')
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Error al guardar avatar'),
  })

  const updatePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => api.put('/users/password', data),
    onSuccess: () => {
      setPwSaved(true)
      setPwForm({ current: '', newPw: '', confirm: '' })
      setTimeout(() => setPwSaved(false), 2000)
      toast.success('¡Contraseña actualizada!')
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Contraseña actual incorrecta'),
  })

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfileMutation.mutate({ username, bio })
  }

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    if (!pwForm.current) { setPwError('La contraseña actual es obligatoria'); return }
    if (pwForm.newPw.length < 8) { setPwError('Mínimo 8 caracteres'); return }
    if (pwForm.newPw !== pwForm.confirm) { setPwError('Las contraseñas no coinciden'); return }
    updatePasswordMutation.mutate({ currentPassword: pwForm.current, newPassword: pwForm.newPw })
  }

  const pwStrength = Math.min(4, [
    pwForm.newPw.length >= 8, /[A-Z]/.test(pwForm.newPw),
    /[0-9]/.test(pwForm.newPw), /[^A-Za-z0-9]/.test(pwForm.newPw),
  ].filter(Boolean).length)

  const activeAccent = ACCENT_COLORS.find((a) => a.id === accentId) ?? ACCENT_COLORS[0]

  return (
    <div className="space-y-6 pb-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-elite-600" />
        <div>
          <h1 className="text-3xl font-bold text-white">Configuración</h1>
          <p className="text-gray-500 mt-1">Gestiona las preferencias de tu cuenta</p>
        </div>
      </div>

      <Tabs.Root defaultValue="profile">
        <Tabs.List className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10 mb-6 w-fit">
          {[
            { value: 'profile',       label: 'Perfil',         icon: User },
            { value: 'notifications', label: 'Notificaciones', icon: Bell },
            { value: 'display',       label: 'Apariencia',     icon: Monitor },
            { value: 'security',      label: 'Seguridad',      icon: Shield },
          ].map(({ value, label, icon: Icon }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-400 data-[state=active]:bg-elite-600 data-[state=active]:text-white transition-all"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* ── Profile Tab ─────────────────────────────────────────── */}
        <Tabs.Content value="profile">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6"
          >
            <h2 className="text-base font-bold text-white mb-5">Ajustes de Perfil</h2>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Avatar preview */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1E1E1E]">
                  <img src={currentAvatar} alt="avatar" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-white font-semibold">{username || 'Nombre de usuario'}</p>
                  <p className="text-gray-500 text-xs">Level {user?.level ?? 1} · {user?.rank ?? 'Rookie'}</p>
                  <p className="text-gray-600 text-[10px] mt-0.5">Cambia tu avatar en la pestaña Apariencia</p>
                </div>
              </div>

              <Input
                label="Nombre de Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tu nombre de usuario"
              />

              <div>
                <label className="text-sm font-medium text-gray-300 mb-1.5 block">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Cuéntanos sobre ti…"
                  rows={3}
                  maxLength={160}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-elite-600 resize-none transition-colors"
                />
                <p className="text-xs text-gray-600 mt-1 text-right">{bio.length}/160</p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  loading={updateProfileMutation.isPending}
                  icon={saved ? <Check className="w-4 h-4" /> : undefined}
                >
                  {saved ? '¡Guardado!' : 'Guardar Perfil'}
                </Button>
                <AnimatePresence>
                  {saved && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-emerald-400 text-sm font-medium"
                    >
                      Cambios guardados
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </form>
          </motion.div>
        </Tabs.Content>

        {/* ── Notifications Tab ────────────────────────────────────── */}
        <Tabs.Content value="notifications">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6"
          >
            <h2 className="text-base font-bold text-white mb-5">Preferencias de Notificaciones</h2>
            <NotifRow label="Notificaciones por Correo" description="Recibe actualizaciones por correo"
              value={notifs.emailNotifications} onChange={(v) => setNotifs((n) => ({ ...n, emailNotifications: v }))} />
            <NotifRow label="Alertas de Logros" description="Recibe notificaciones al desbloquear logros"
              value={notifs.achievementAlerts} onChange={(v) => setNotifs((n) => ({ ...n, achievementAlerts: v }))} />
            <NotifRow label="Informe Semanal" description="Resumen semanal de progreso"
              value={notifs.weeklyReport} onChange={(v) => setNotifs((n) => ({ ...n, weeklyReport: v }))} />
            <NotifRow label="Recordatorios de Metas" description="Recordatorios sobre plazos de tus metas"
              value={notifs.goalReminders} onChange={(v) => setNotifs((n) => ({ ...n, goalReminders: v }))} />
            <div className="mt-5">
              <Button variant="primary">Guardar Preferencias</Button>
            </div>
          </motion.div>
        </Tabs.Content>

        {/* ── Display Tab ──────────────────────────────────────────── */}
        <Tabs.Content value="display">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 space-y-8"
          >
            <h2 className="text-base font-bold text-white">Ajustes de Apariencia</h2>

            {/* ── Accent color ─────────────────────────────────────── */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-3 block">Color de Acento</label>
              <div className="flex gap-4 flex-wrap">
                {ACCENT_COLORS.map((c) => {
                  const isActive = accentId === c.id
                  return (
                    <motion.button
                      key={c.id}
                      onClick={() => setAccent(c.id as AccentId)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div
                        className={`w-9 h-9 rounded-full border-2 transition-all shadow-md ${
                          isActive ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                        style={{ background: c.hex, boxShadow: isActive ? `0 0 12px ${c.hex}88` : undefined }}
                      />
                      <span className={`text-xs transition-colors ${isActive ? 'text-white font-semibold' : 'text-gray-600'}`}>
                        {c.label}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="w-4 h-4 rounded-full" style={{ background: activeAccent.hex }} />
                <span className="text-xs text-gray-400">Acento activo: <span className="text-white font-semibold">{activeAccent.label}</span></span>
                <span className="text-xs text-gray-600 ml-auto">{activeAccent.hex}</span>
              </div>
            </div>

            {/* ── Avatar ───────────────────────────────────────────── */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1 block">Avatar</label>
              <p className="text-xs text-gray-600 mb-4">Selecciona un avatar predeterminado o usa una skin del Mercado</p>

              {/* Preview */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 mb-5">
                <motion.div
                  key={displayAvatar}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-14 h-14 rounded-full overflow-hidden bg-[#1E1E1E] border-2 border-elite-600/40"
                >
                  <img src={displayAvatar} alt="preview" className="w-full h-full object-cover" />
                </motion.div>
                <div>
                  <p className="text-white font-semibold">{user?.username}</p>
                  <p className="text-gray-500 text-xs">Level {user?.level ?? 1} · {user?.rank ?? 'Rookie'}</p>
                  {pendingAvatar && (
                    <p className="text-elite-600 text-[10px] mt-1">Sin guardar — pulsa Guardar Avatar</p>
                  )}
                </div>
              </div>

              {/* Default avatars */}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Predeterminados</p>
              <div className="flex gap-3 flex-wrap mb-5">
                {DEFAULT_AVATARS.map(({ url, label }) => {
                  const isSelected = (pendingAvatar ?? currentAvatar) === url
                  return (
                    <motion.button
                      key={url}
                      type="button"
                      onClick={() => setPendingAvatar(url)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      title={label}
                      className={`relative w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${
                        isSelected
                          ? 'border-elite-600 shadow-[0_0_12px_rgba(var(--accent-rgb),0.5)]'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img src={url} alt={label} className="w-full h-full object-cover bg-[#1E1E1E]" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-elite-600/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-white drop-shadow" />
                        </div>
                      )}
                    </motion.button>
                  )
                })}
              </div>

              {/* Shop skins */}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <ShoppingBag className="w-3 h-3" /> Skins del Mercado
              </p>
              {ownedAvatarSlugs.length === 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-gray-600 text-sm">
                  <ShoppingBag className="w-4 h-4 flex-shrink-0" />
                  No tienes skins de avatar. Visita el <a href="/shop" className="text-elite-600 hover:underline ml-1">Mercado</a> para comprar.
                </div>
              ) : (
                <div className="flex gap-3 flex-wrap">
                  {ownedAvatarSlugs.map((slug) => {
                    const meta = SHOP_AVATAR_META[slug]
                    const skinUrl = getAvatarUrl(slug, user?.username ?? 'user')
                    const isSelected = (pendingAvatar ?? user?.avatar) === slug
                    const rarityClass = RARITY_COLOR[meta?.rarity ?? 'common']
                    return (
                      <motion.button
                        key={slug}
                        type="button"
                        onClick={() => setPendingAvatar(slug)}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative flex flex-col items-center gap-1`}
                      >
                        <div className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${
                          isSelected
                            ? 'border-elite-600 shadow-[0_0_12px_rgba(var(--accent-rgb),0.5)]'
                            : `${rarityClass.split(' ')[0]} hover:border-white/40`
                        }`}>
                          <img src={skinUrl} alt={meta?.label} className="w-full h-full object-cover bg-[#1E1E1E]" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-elite-600/20 flex items-center justify-center">
                              <Check className="w-5 h-5 text-white drop-shadow" />
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] font-medium ${rarityClass.split(' ')[1]}`}>
                          {meta?.icon} {meta?.label}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              )}

              {/* Save avatar button */}
              <div className="mt-5">
                <Button
                  variant="primary"
                  loading={saveAvatarMutation.isPending}
                  disabled={!pendingAvatar || saveAvatarMutation.isPending}
                  onClick={() => pendingAvatar && saveAvatarMutation.mutate(pendingAvatar)}
                  icon={<Check className="w-4 h-4" />}
                >
                  Guardar Avatar
                </Button>
              </div>
            </div>

            {/* Theme */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-3 block">Tema</label>
              <div className="flex gap-3 flex-wrap">
                {[
                  { id: 'dark'  as const, label: '🌑 Modo Oscuro' },
                  { id: 'light' as const, label: '☀️ Modo Claro' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setColorMode(t.id)}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      colorMode === t.id
                        ? 'bg-elite-600/10 border-elite-600/50 text-white'
                        : 'border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </Tabs.Content>

        {/* ── Security Tab ─────────────────────────────────────────── */}
        <Tabs.Content value="security">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6"
          >
            <h2 className="text-base font-bold text-white mb-5">Cambiar Contraseña</h2>

            <form onSubmit={handleSavePassword} className="space-y-4 max-w-md">
              <Input
                label="Contraseña Actual"
                type={showPw.current ? 'text' : 'password'}
                value={pwForm.current}
                onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                placeholder="Ingresa tu contraseña actual"
                iconRight={
                  <button type="button" onClick={() => setShowPw((s) => ({ ...s, current: !s.current }))} className="text-gray-500 hover:text-white">
                    {showPw.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              <Input
                label="Nueva Contraseña"
                type={showPw.newPw ? 'text' : 'password'}
                value={pwForm.newPw}
                onChange={(e) => setPwForm((f) => ({ ...f, newPw: e.target.value }))}
                placeholder="Mínimo 8 caracteres"
                hint="Usa letras, números y símbolos"
                iconRight={
                  <button type="button" onClick={() => setShowPw((s) => ({ ...s, newPw: !s.newPw }))} className="text-gray-500 hover:text-white">
                    {showPw.newPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              <Input
                label="Confirmar Nueva Contraseña"
                type={showPw.confirm ? 'text' : 'password'}
                value={pwForm.confirm}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                placeholder="Repite la nueva contraseña"
                error={pwError}
                iconRight={
                  <button type="button" onClick={() => setShowPw((s) => ({ ...s, confirm: !s.confirm }))} className="text-gray-500 hover:text-white">
                    {showPw.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              {pwForm.newPw && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1.5">
                  <p className="text-xs text-gray-500">Seguridad de la contraseña</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((lvl) => (
                      <div key={lvl} className={`flex-1 h-1.5 rounded-full transition-colors ${
                        lvl <= pwStrength
                          ? ['bg-red-500','bg-orange-500','bg-yellow-500','bg-emerald-500'][pwStrength - 1]
                          : 'bg-white/10'
                      }`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-600">
                    {['Muy débil','Débil','Regular','Fuerte','✓ Muy fuerte'][pwStrength]}
                  </p>
                </motion.div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={updatePasswordMutation.isPending}
                  icon={pwSaved ? <Check className="w-4 h-4" /> : undefined}
                >
                  {pwSaved ? '¡Actualizada!' : 'Actualizar Contraseña'}
                </Button>
              </div>
            </form>

            {/* Danger zone */}
            <div className="mt-8 pt-6 border-t border-[#1E1E1E]">
              <h3 className="text-sm font-semibold text-red-400 mb-3">Zona de Peligro</h3>
              <div className="p-4 rounded-xl border border-red-900/30 bg-red-950/20">
                <p className="text-sm text-gray-400 mb-3">Elimina permanentemente tu cuenta y todos los datos. Esta acción no se puede deshacer.</p>
                <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>Eliminar Cuenta</Button>
              </div>
            </div>
          </motion.div>
        </Tabs.Content>
      </Tabs.Root>

      {/* ── Delete Account Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111111] border border-red-900/40 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-950 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Eliminar Cuenta</h3>
                  <p className="text-gray-500 text-xs">Esta acción es permanente e irreversible</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/30 mb-5">
                <p className="text-red-300 text-sm">Se eliminarán todos tus datos: hábitos, sesiones, metas, finanzas, logros y estadísticas.</p>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); setDeleteError(''); if (!deletePassword) { setDeleteError('Ingresa tu contraseña'); return }; deleteAccountMutation.mutate(deletePassword) }} className="space-y-4">
                <Input
                  label="Confirma tu contraseña"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Ingresa tu contraseña actual"
                  error={deleteError}
                />
                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="ghost" className="flex-1" onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteError('') }}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="danger" className="flex-1" loading={deleteAccountMutation.isPending}>
                    Eliminar para siempre
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
