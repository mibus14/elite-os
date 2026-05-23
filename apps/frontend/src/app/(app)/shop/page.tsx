'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Zap, Check, Package, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { shopApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'

/* ─── Types ─────────────────────────────────────────────────────────── */
interface ShopItem {
  slug: string
  name: string
  desc: string
  category: string
  price: number
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  owned: boolean
  equipped: boolean
  frame?: string
  gradient?: string
  style?: string
  multiplier?: number
  hours?: number
  activeBoost?: { multiplier: number; expiresAt: string } | null
}

interface CatalogResponse {
  items: ShopItem[]
  gold: number
  equipped: { frame: string | null; title: string | null; bg: string | null }
}

/* ─── Rarity config ─────────────────────────────────────────────────── */
const RARITY_STYLE: Record<string, { border: string; badge: string; glow: string; label: string }> = {
  common:    { border: 'border-gray-700',       badge: 'bg-gray-700 text-gray-300',      glow: '',                                          label: 'Común'     },
  rare:      { border: 'border-blue-700/60',    badge: 'bg-blue-900/60 text-blue-300',   glow: 'shadow-[0_0_10px_rgba(59,130,246,0.2)]',    label: 'Raro'      },
  epic:      { border: 'border-purple-700/60',  badge: 'bg-purple-900/60 text-purple-300',glow: 'shadow-[0_0_10px_rgba(168,85,247,0.25)]',  label: 'Épico'     },
  legendary: { border: 'border-yellow-600/60',  badge: 'bg-yellow-900/50 text-yellow-300',glow: 'shadow-[0_0_14px_rgba(234,179,8,0.3)]',   label: 'Legendario'},
}

const CATEGORY_LABELS: Record<string, string> = {
  all:        'Todo',
  frame:      'Marcos',
  title:      'Títulos',
  background: 'Fondos',
  avatar:     'Avatares',
  boost:      'Impulsos XP',
}

/* ─── Item card ─────────────────────────────────────────────────────── */
function ItemCard({
  item,
  gold,
  onBuy,
  onEquip,
  isBuying,
  isEquipping,
}: {
  item: ShopItem
  gold: number
  onBuy: (slug: string) => void
  onEquip: (slug: string) => void
  isBuying: boolean
  isEquipping: boolean
}) {
  const r = RARITY_STYLE[item.rarity] ?? RARITY_STYLE.common
  const canAfford = gold >= item.price
  const isBoost = item.category === 'boost'
  const boostActive = !!item.activeBoost

  const hoursLeft = boostActive
    ? Math.max(0, Math.round((new Date(item.activeBoost!.expiresAt).getTime() - Date.now()) / 3_600_000))
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative flex flex-col bg-[#111111] border ${r.border} rounded-2xl p-4 ${r.glow} transition-all hover:border-opacity-80`}
    >
      {/* Rarity badge */}
      <div className="absolute top-3 right-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.badge}`}>
          {r.label}
        </span>
      </div>

      {/* Icon */}
      <div className="text-4xl mb-3 leading-none">{item.icon}</div>

      {/* Name + desc */}
      <h3 className="text-white font-bold text-sm mb-1 pr-16 leading-tight">{item.name}</h3>
      <p className="text-gray-500 text-xs mb-3 flex-1 leading-relaxed">{item.desc}</p>

      {/* Boost timer */}
      {isBoost && boostActive && (
        <div className="mb-3 px-2 py-1.5 bg-green-900/20 border border-green-700/30 rounded-lg flex items-center gap-1.5">
          <Zap size={12} className="text-green-400" />
          <span className="text-xs text-green-400 font-medium">Activo — {hoursLeft}h restantes</span>
        </div>
      )}

      {/* Boost info */}
      {isBoost && !boostActive && (
        <div className="mb-3 text-xs text-purple-400 font-medium flex items-center gap-1">
          <Zap size={11} />
          x{item.multiplier} XP · {item.hours}h
        </div>
      )}

      {/* Price + actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-sm font-bold text-yellow-400">
          🪙 {item.price.toLocaleString()}
        </div>
        <div className="flex-1" />

        {item.owned && !isBoost ? (
          <Button
            size="sm"
            variant={item.equipped ? 'primary' : 'ghost'}
            onClick={() => onEquip(item.slug)}
            loading={isEquipping}
            icon={item.equipped ? <Check size={12} /> : undefined}
          >
            {item.equipped ? 'Equipado' : 'Equipar'}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="primary"
            onClick={() => onBuy(item.slug)}
            loading={isBuying}
            disabled={!canAfford}
            icon={!canAfford ? <Lock size={12} /> : undefined}
          >
            {isBoost && boostActive ? 'Renovar' : canAfford ? 'Comprar' : 'Sin oro'}
          </Button>
        )}
      </div>
    </motion.div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function ShopPage() {
  const queryClient = useQueryClient()
  const [category, setCategory] = useState('all')
  const [buyingSlug, setBuyingSlug] = useState<string | null>(null)
  const [equippingSlug, setEquippingSlug] = useState<string | null>(null)

  const { data, isLoading } = useQuery<CatalogResponse>({
    queryKey: ['shop-catalog'],
    queryFn: () => shopApi.catalog().then(r => r.data),
    staleTime: 30_000,
  })

  const buyMutation = useMutation({
    mutationFn: (slug: string) => shopApi.buy(slug),
    onMutate: (slug) => setBuyingSlug(slug),
    onSuccess: (res, slug) => {
      const item = data?.items.find(i => i.slug === slug)
      toast.success(`${item?.icon ?? '✅'} ${item?.name ?? 'Ítem'} comprado — ${res.data.gold} 🪙 restantes`)
      queryClient.invalidateQueries({ queryKey: ['shop-catalog'] })
      queryClient.invalidateQueries({ queryKey: ['rpg-character'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Error al comprar'),
    onSettled: () => setBuyingSlug(null),
  })

  const equipMutation = useMutation({
    mutationFn: (slug: string) => shopApi.equip(slug),
    onMutate: (slug) => setEquippingSlug(slug),
    onSuccess: (res, slug) => {
      const item = data?.items.find(i => i.slug === slug)
      const action = res.data.equipped ? 'equipado' : 'desequipado'
      toast.success(`${item?.icon ?? '✅'} ${item?.name} ${action}`)
      queryClient.invalidateQueries({ queryKey: ['shop-catalog'] })
      queryClient.invalidateQueries({ queryKey: ['rpg-character'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Error al equipar'),
    onSettled: () => setEquippingSlug(null),
  })

  const categories = ['all', 'frame', 'title', 'background', 'avatar', 'boost']
  const filtered = (data?.items ?? []).filter(i => category === 'all' || i.category === category)
  const gold = data?.gold ?? 0

  return (
    <div className="space-y-6 pb-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-8 h-8 text-[#DC143C]" />
          <div>
            <h1 className="text-3xl font-bold text-white">Mercado</h1>
            <p className="text-gray-500 mt-1">Personaliza tu personaje con oro ganado</p>
          </div>
        </div>

        {/* Gold balance */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 px-4 py-2.5 bg-yellow-900/20 border border-yellow-700/40 rounded-xl"
        >
          <span className="text-2xl">🪙</span>
          <div>
            <p className="text-xs text-yellow-600 font-medium">Oro disponible</p>
            <p className="text-xl font-bold text-yellow-400">{gold.toLocaleString()}</p>
          </div>
        </motion.div>
      </div>

      {/* How to earn gold */}
      <div className="p-4 bg-[#111111] border border-[#1E1E1E] rounded-xl">
        <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">¿Cómo ganar oro?</p>
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span>⚡ 1 oro por cada 5 XP ganados</span>
          <span>🔥 +50 oro racha 7 días</span>
          <span>💪 +200 oro racha 30 días</span>
          <span>👑 +500 oro racha 100 días</span>
          <span>🪙 +20 oro cada 7 días de racha</span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              category === cat
                ? 'bg-[#DC143C] text-white'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Items grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={category}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {filtered.map((item, i) => (
              <motion.div
                key={item.slug}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <ItemCard
                  item={item}
                  gold={gold}
                  onBuy={slug => buyMutation.mutate(slug)}
                  onEquip={slug => equipMutation.mutate(slug)}
                  isBuying={buyingSlug === item.slug && buyMutation.isPending}
                  isEquipping={equippingSlug === item.slug && equipMutation.isPending}
                />
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-16 text-center">
                <Package className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500">No hay ítems en esta categoría</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
