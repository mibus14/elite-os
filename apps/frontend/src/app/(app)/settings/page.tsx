'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import * as Tabs from '@radix-ui/react-tabs'
import { Settings, User, Bell, Monitor, Shield, Check, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

/* ─── Avatar options ─────────────────────────────────────────────── */
const AVATAR_SEEDS = ['felix', 'alex', 'sam', 'jordan', 'taylor', 'casey']
const AVATAR_URLS = AVATAR_SEEDS.map(
  (seed) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`
)

/* ─── Toggle Switch ──────────────────────────────────────────────── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <motion.button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        checked ? 'bg-[#DC143C]' : 'bg-white/10'
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

/* ─── Notification row ───────────────────────────────────────────── */
function NotifRow({ label, description, value, onChange }: {
  label: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
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

/* ─── Page ───────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const queryClient = useQueryClient()

  // Profile state
  const [avatar, setAvatar] = useState(user?.avatar ?? AVATAR_URLS[0])
  const [username, setUsername] = useState(user?.username ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [saved, setSaved] = useState(false)

  // Notifications
  const [notifs, setNotifs] = useState({
    emailNotifications: true,
    achievementAlerts: true,
    weeklyReport: false,
    goalReminders: true,
  })

  // Security
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false })
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  const updateProfileMutation = useMutation({
    mutationFn: (data: { username?: string; avatar?: string; bio?: string }) =>
      api.put('/users/profile', data),
    onSuccess: (res) => {
      updateUser(res.data.user ?? { username, bio, avatar })
      queryClient.invalidateQueries({ queryKey: ['rpg-character'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      toast.success('¡Perfil actualizado!')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Error al guardar')
    },
  })

  const updatePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.put('/users/password', data),
    onSuccess: () => {
      setPwSaved(true)
      setPwForm({ current: '', newPw: '', confirm: '' })
      setTimeout(() => setPwSaved(false), 2000)
      toast.success('¡Contraseña actualizada!')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Contraseña actual incorrecta')
    },
  })

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfileMutation.mutate({ username, bio, avatar })
  }

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    if (!pwForm.current) { setPwError('La contraseña actual es obligatoria'); return }
    if (pwForm.newPw.length < 8) { setPwError('La nueva contraseña debe tener al menos 8 caracteres'); return }
    if (pwForm.newPw !== pwForm.confirm) { setPwError('Las contraseñas no coinciden'); return }
    updatePasswordMutation.mutate({ currentPassword: pwForm.current, newPassword: pwForm.newPw })
  }

  const pwStrength = Math.min(4,
    [
      pwForm.newPw.length >= 8,
      /[A-Z]/.test(pwForm.newPw),
      /[0-9]/.test(pwForm.newPw),
      /[^A-Za-z0-9]/.test(pwForm.newPw),
    ].filter(Boolean).length
  )

  return (
    <div className="space-y-6 pb-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-[#DC143C]" />
        <div>
          <h1 className="text-3xl font-bold text-white">Configuración</h1>
          <p className="text-gray-500 mt-1">Gestiona las preferencias de tu cuenta</p>
        </div>
      </div>

      <Tabs.Root defaultValue="profile">
        <Tabs.List className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10 mb-6 w-fit">
          {[
            { value: 'profile',       label: 'Perfil',          icon: User },
            { value: 'notifications', label: 'Notificaciones',  icon: Bell },
            { value: 'display',       label: 'Apariencia',      icon: Monitor },
            { value: 'security',      label: 'Seguridad',       icon: Shield },
          ].map(({ value, label, icon: Icon }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-400 data-[state=active]:bg-[#DC143C] data-[state=active]:text-white transition-all"
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
              {/* Avatar selection */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-3 block">Avatar</label>
                <div className="flex gap-3 flex-wrap">
                  {AVATAR_URLS.map((url) => (
                    <motion.button
                      key={url}
                      type="button"
                      onClick={() => setAvatar(url)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      className={`relative w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${
                        avatar === url
                          ? 'border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.5)]'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img src={url} alt="avatar" className="w-full h-full object-cover bg-[#1E1E1E]" />
                      {avatar === url && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute inset-0 bg-[#DC143C]/30 flex items-center justify-center"
                        >
                          <Check className="w-5 h-5 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1E1E1E]">
                  <img src={avatar} alt="preview" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-white font-semibold">{username || 'Nombre de usuario'}</p>
                  <p className="text-gray-500 text-xs">Level {user?.level ?? 1} · {user?.rank ?? 'Rookie'}</p>
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#DC143C] resize-none transition-colors"
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
                      Cambios guardados correctamente
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

            <div>
              <NotifRow
                label="Notificaciones por Correo"
                description="Recibe actualizaciones de actividad por correo electrónico"
                value={notifs.emailNotifications}
                onChange={(v) => setNotifs((n) => ({ ...n, emailNotifications: v }))}
              />
              <NotifRow
                label="Alertas de Logros"
                description="Recibe notificaciones al desbloquear logros"
                value={notifs.achievementAlerts}
                onChange={(v) => setNotifs((n) => ({ ...n, achievementAlerts: v }))}
              />
              <NotifRow
                label="Informe Semanal"
                description="Recibe un resumen semanal de tu progreso"
                value={notifs.weeklyReport}
                onChange={(v) => setNotifs((n) => ({ ...n, weeklyReport: v }))}
              />
              <NotifRow
                label="Recordatorios de Metas"
                description="Recibe recordatorios sobre los plazos de tus metas"
                value={notifs.goalReminders}
                onChange={(v) => setNotifs((n) => ({ ...n, goalReminders: v }))}
              />
            </div>

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
            className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 space-y-6"
          >
            <h2 className="text-base font-bold text-white">Ajustes de Apariencia</h2>

            {/* Theme */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-3 block">Tema</label>
              <div className="flex gap-3 flex-wrap">
                {[
                  { id: 'dark',   label: '🌑 Modo Oscuro',  active: true  },
                  { id: 'light',  label: '☀️ Modo Claro',   active: false },
                  { id: 'system', label: '💻 Sistema',      active: false },
                ].map((t) => (
                  <button
                    key={t.id}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      t.active
                        ? 'bg-[#DC143C]/10 border-[#DC143C]/50 text-white'
                        : 'border-white/10 text-gray-500 cursor-not-allowed opacity-50'
                    }`}
                    disabled={!t.active}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">ELITE OS está diseñado exclusivamente para Modo Oscuro. El modo claro estará disponible pronto.</p>
            </div>

            {/* Accent color */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-3 block">Color de Acento</label>
              <div className="flex gap-4">
                {[
                  { color: '#DC143C', label: 'Rojo Elite', active: true  },
                  { color: '#3B82F6', label: 'Azul',       active: false },
                  { color: '#8B5CF6', label: 'Morado',     active: false },
                  { color: '#22C55E', label: 'Verde',      active: false },
                ].map((c) => (
                  <div key={c.color} className="flex flex-col items-center gap-1.5">
                    <button
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        c.active ? 'border-white scale-110' : 'border-transparent opacity-40 cursor-not-allowed'
                      }`}
                      style={{ background: c.color }}
                      disabled={!c.active}
                    />
                    <span className="text-xs text-gray-600">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Current config */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Configuración Actual</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Tema</div><div className="text-white">Modo Oscuro</div>
                <div className="text-gray-500">Acento</div><div className="text-[#DC143C] font-semibold">Rojo Elite #DC143C</div>
                <div className="text-gray-500">Fondo</div><div className="text-white">#0A0A0A</div>
                <div className="text-gray-500">Tarjetas</div><div className="text-white">#111111</div>
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
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => ({ ...s, current: !s.current }))}
                    className="text-gray-500 hover:text-white"
                  >
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
                hint="Usa una contraseña segura con letras, números y símbolos"
                iconRight={
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => ({ ...s, newPw: !s.newPw }))}
                    className="text-gray-500 hover:text-white"
                  >
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
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => ({ ...s, confirm: !s.confirm }))}
                    className="text-gray-500 hover:text-white"
                  >
                    {showPw.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              {/* Password strength */}
              {pwForm.newPw && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1.5"
                >
                  <p className="text-xs text-gray-500">Seguridad de la contraseña</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((lvl) => {
                      const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500']
                      return (
                        <div
                          key={lvl}
                          className={`flex-1 h-1.5 rounded-full transition-colors ${
                            lvl <= pwStrength ? strengthColors[pwStrength - 1] : 'bg-white/10'
                          }`}
                        />
                      )
                    })}
                  </div>
                  <p className="text-xs text-gray-600">
                    {pwStrength === 0 && 'Muy débil'}
                    {pwStrength === 1 && 'Débil'}
                    {pwStrength === 2 && 'Regular'}
                    {pwStrength === 3 && 'Fuerte'}
                    {pwStrength === 4 && '✓ Muy fuerte'}
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
                  {pwSaved ? '¡Contraseña Actualizada!' : 'Actualizar Contraseña'}
                </Button>
                <AnimatePresence>
                  {pwSaved && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-emerald-400 text-sm"
                    >
                      Contraseña cambiada correctamente
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </form>

            {/* Danger zone */}
            <div className="mt-8 pt-6 border-t border-[#1E1E1E]">
              <h3 className="text-sm font-semibold text-red-400 mb-3">Zona de Peligro</h3>
              <div className="p-4 rounded-xl border border-red-900/30 bg-red-950/20">
                <p className="text-sm text-gray-400 mb-3">Elimina permanentemente tu cuenta y todos los datos asociados. Esta acción no se puede deshacer.</p>
                <Button variant="danger" size="sm">Eliminar Cuenta</Button>
              </div>
            </div>
          </motion.div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
