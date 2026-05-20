'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Bell, Shield, Moon, Save, Camera } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

const AVATAR_SEEDS = [
  { seed: 'felix',    style: 'avataaars' },
  { seed: 'aneka',    style: 'avataaars' },
  { seed: 'shadow',   style: 'avataaars' },
  { seed: 'warrior',  style: 'avataaars' },
  { seed: 'hunter',   style: 'avataaars' },
  { seed: 'neon',     style: 'avataaars' },
]

type Tab = 'profile' | 'notifications' | 'security' | 'display'

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [username, setUsername]   = useState(user?.username ?? '')
  const [bio, setBio]             = useState(user?.bio ?? '')
  const [avatar, setAvatar]       = useState(user?.avatar ?? '')
  const [saved, setSaved]         = useState(false)

  const [notifs, setNotifs] = useState({
    achievements: true, weeklyReport: true, goalReminders: true, chatMessages: true,
  })

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })

  const handleSaveProfile = () => {
    updateUser({ username, bio, avatar })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile',       label: 'Profile',       icon: <User size={15}/> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={15}/> },
    { id: 'display',       label: 'Display',       icon: <Moon size={15}/> },
    { id: 'security',      label: 'Security',      icon: <Shield size={15}/> },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-white">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/10">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all',
              activeTab===t.id ? 'bg-elite-600 text-white shadow-glow-red' : 'text-gray-400 hover:text-white')}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
          className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 space-y-6">
          <div>
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Avatar</p>
            <div className="grid grid-cols-6 gap-3">
              {AVATAR_SEEDS.map(a => {
                const url = `https://api.dicebear.com/7.x/${a.style}/svg?seed=${a.seed}`
                return (
                  <button key={a.seed} onClick={() => setAvatar(url)}
                    className={cn('rounded-xl overflow-hidden border-2 transition-all',
                      avatar===url ? 'border-elite-600 shadow-glow-red' : 'border-transparent hover:border-white/20')}>
                    <img src={url} alt={a.seed} className="w-full aspect-square bg-[#1E1E1E]"/>
                  </button>
                )
              })}
            </div>
          </div>
          <Input label="Username" value={username} onChange={e=>setUsername(e.target.value)} iconLeft={<User size={14}/>}/>
          <div>
            <label className="text-sm text-gray-400 block mb-1.5">Bio</label>
            <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={3} placeholder="Tell your team about yourself..."
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-elite-600 transition-all resize-none"/>
          </div>
          <Button onClick={handleSaveProfile} icon={<Save size={14}/>} fullWidth variant={saved ? 'gold' : 'primary'}>
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </motion.div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
          className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 space-y-4">
          {[
            { key: 'achievements',  label: 'Achievement Alerts',  desc: 'When you unlock badges or level up' },
            { key: 'weeklyReport',  label: 'Weekly Report',        desc: 'Summary of your week every Sunday' },
            { key: 'goalReminders', label: 'Goal Reminders',       desc: 'Reminders for approaching deadlines' },
            { key: 'chatMessages',  label: 'Chat Messages',        desc: 'New messages from teammates' },
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between py-3 border-b border-[#1A1A1A] last:border-0">
              <div>
                <p className="text-sm font-medium text-white">{n.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.desc}</p>
              </div>
              <button onClick={() => setNotifs(p => ({...p, [n.key as keyof typeof p]: !p[n.key as keyof typeof p]}))}
                className={cn('w-11 h-6 rounded-full transition-all relative flex-shrink-0',
                  notifs[n.key as keyof typeof notifs] ? 'bg-elite-600' : 'bg-white/10')}>
                <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all',
                  notifs[n.key as keyof typeof notifs] ? 'left-5.5 translate-x-0' : 'left-0.5')}/>
              </button>
            </div>
          ))}
        </motion.div>
      )}

      {/* Display Tab */}
      {activeTab === 'display' && (
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
          className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-elite-600/10 border border-elite-600/30">
            <Moon size={24} className="text-elite-600"/>
            <div>
              <p className="text-sm font-semibold text-white">Dark Mode — Cyberpunk</p>
              <p className="text-xs text-gray-500 mt-0.5">ELITE OS uses an exclusive dark mode — no light mode available.</p>
            </div>
            <span className="ml-auto text-xs bg-elite-600/20 text-elite-600 border border-elite-600/30 px-2 py-0.5 rounded-full font-medium">Active</span>
          </div>
        </motion.div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
          className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 space-y-4">
          <Input label="Current Password" type="password" placeholder="••••••••" value={passwords.current} onChange={e=>setPasswords(p=>({...p,current:e.target.value}))}/>
          <Input label="New Password" type="password" placeholder="••••••••" value={passwords.next} onChange={e=>setPasswords(p=>({...p,next:e.target.value}))}/>
          <Input label="Confirm New Password" type="password" placeholder="••••••••" value={passwords.confirm} onChange={e=>setPasswords(p=>({...p,confirm:e.target.value}))}
            error={passwords.confirm && passwords.next !== passwords.confirm ? "Passwords don't match" : undefined}/>
          <Button fullWidth variant="danger" disabled={!passwords.current || !passwords.next || passwords.next !== passwords.confirm}>
            Update Password
          </Button>
        </motion.div>
      )}
    </div>
  )
}
