'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, Plus, X, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { financeApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

/* ─── Types ──────────────────────────────────────────────────────── */
interface FinanceEntry {
  id: string
  date: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string
}

const CATEGORY_META: Record<string, { emoji: string; color: string }> = {
  food:       { emoji: '🍔', color: '#F97316' },
  salary:     { emoji: '💼', color: '#22C55E' },
  fitness:    { emoji: '🏋️', color: '#DC143C' },
  education:  { emoji: '📚', color: '#3B82F6' },
  transport:  { emoji: '🚗', color: '#8B5CF6' },
  freelance:  { emoji: '💻', color: '#06B6D4' },
  housing:    { emoji: '🏠', color: '#EC4899' },
  healthcare: { emoji: '💊', color: '#F59E0B' },
  entertainment: { emoji: '🎬', color: '#A855F7' },
  other:      { emoji: '📦', color: '#6B7280' },
}

const EXPENSE_CATEGORIES = ['food', 'fitness', 'education', 'transport', 'housing', 'healthcare', 'entertainment', 'other']
const INCOME_CATEGORIES = ['salary', 'freelance', 'investment', 'other']

/* ─── Custom tooltip ─────────────────────────────────────────────── */
function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl px-3 py-2 text-xs">
      <p className="text-white font-semibold">{payload[0].name}</p>
      <p className="text-gray-400">${payload[0].value.toFixed(2)}</p>
    </div>
  )
}

/* ─── Add Transaction Modal ──────────────────────────────────────── */
function AddTransactionModal({ open, onClose, onAdd }: {
  open: boolean
  onClose: () => void
  onAdd: (data: object) => void
}) {
  const [form, setForm] = useState({
    type: 'expense' as 'income' | 'expense',
    category: 'food',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.amount || !form.description) return
    onAdd({ ...form, amount: Number(form.amount), id: String(Date.now()) })
    setForm({ type: 'expense', category: 'food', amount: '', description: '', date: new Date().toISOString().split('T')[0] })
    onClose()
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Agregar Transacción</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type toggle */}
            <div className="flex gap-2">
              {(['expense', 'income'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    set('type', t)
                    set('category', t === 'income' ? 'salary' : 'food')
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm transition-all ${
                    form.type === t
                      ? t === 'income'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-red-500/20 border-red-500/50 text-red-400'
                      : 'border-white/10 text-gray-500'
                  }`}
                >
                  {t === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {t === 'income' ? 'Ingresos' : 'Gastos'}
                </button>
              ))}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Categoría</label>
              <div className="grid grid-cols-4 gap-2">
                {categories.map((cat) => {
                  const meta = CATEGORY_META[cat] ?? CATEGORY_META.other
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => set('category', cat)}
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-xs transition-all ${
                        form.category === cat
                          ? 'border-[#DC143C]/60 bg-[#DC143C]/10 text-white'
                          : 'border-white/10 text-gray-500 hover:border-white/20'
                      }`}
                    >
                      <span className="text-lg">{meta.emoji}</span>
                      <span className="capitalize truncate w-full text-center px-1">{cat}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <Input label="Fecha" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />

            <div className="relative">
              <Input
                label="Monto ($)"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <Input label="Descripción" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="ej. Supermercado" />

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" fullWidth onClick={onClose} type="button">Cancelar</Button>
              <Button variant="primary" fullWidth type="submit" icon={<Plus className="w-4 h-4" />}>Agregar</Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function FinancePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [localEntries, setLocalEntries] = useState<FinanceEntry[]>([])
  const queryClient = useQueryClient()

  const { data: entriesData, isLoading } = useQuery({
    queryKey: ['finance-entries'],
    queryFn: async () => {
      const res = await financeApi.entries()
      return (res.data.entries ?? res.data) as FinanceEntry[]
    },
  })

  useEffect(() => {
    if (entriesData) setLocalEntries(entriesData)
  }, [entriesData])

  const createMutation = useMutation({
    mutationFn: (data: object) => financeApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance-entries'] }),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => financeApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance-entries'] }),
  })

  const entries = localEntries

  const handleAdd = (data: object) => {
    setLocalEntries((prev) => [data as FinanceEntry, ...prev])
    createMutation.mutate(data)
  }

  const handleRemove = (id: string) => {
    setLocalEntries((prev) => prev.filter((e) => e.id !== id))
    removeMutation.mutate(id)
  }

  // Month calculations
  const now = new Date()
  const currentMonth = now.getMonth()
  const monthEntries = entries.filter((e) => new Date(e.date).getMonth() === currentMonth)
  const income = monthEntries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const expenses = monthEntries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const net = income - expenses

  // Pie chart data
  const expenseByCategory = EXPENSE_CATEGORIES.reduce((acc, cat) => {
    const total = entries.filter((e) => e.type === 'expense' && e.category === cat).reduce((s, e) => s + e.amount, 0)
    if (total > 0) acc.push({ name: cat.charAt(0).toUpperCase() + cat.slice(1), value: Number(total.toFixed(2)) })
    return acc
  }, [] as { name: string; value: number }[])

  const PIE_COLORS = expenseByCategory.map((_, i) =>
    Object.values(CATEGORY_META)[i % Object.values(CATEGORY_META).length]?.color ?? '#6B7280'
  )

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 uppercase tracking-wide">
            <DollarSign className="w-7 h-7 text-[#DC143C]" />
            Tesorería
          </h1>
          <p className="text-gray-500 mt-1">Guarda tu oro, controla tu riqueza</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
        >
          <span className="hidden sm:inline">Agregar Transacción</span>
          <span className="sm:hidden">Añadir</span>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Ingresos del Mes', value: income, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: <TrendingUp className="w-5 h-5 text-emerald-400" />, prefix: '+$' },
          { label: 'Gastos', value: expenses, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: <TrendingDown className="w-5 h-5 text-red-400" />, prefix: '-$' },
          { label: 'Saldo Neto', value: net, color: net >= 0 ? 'text-emerald-400' : 'text-red-400', bg: net >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10', border: net >= 0 ? 'border-emerald-500/20' : 'border-red-500/20', icon: <DollarSign className={`w-5 h-5 ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />, prefix: net >= 0 ? '+$' : '-$' },
        ].map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className={`bg-[#111111] border ${card.border} rounded-2xl p-5 flex items-center justify-between`}
          >
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{card.label}</p>
              <p className={`text-2xl font-bold font-heading ${card.color}`}>
                {card.prefix}{Math.abs(card.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className={`p-2.5 rounded-xl ${card.bg}`}>{card.icon}</div>
          </motion.div>
        ))}
      </div>

      {/* Donut chart + transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6"
        >
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-5">Gastos por Categoría</h2>
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {expenseByCategory.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx]} opacity={0.85} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(val) => <span style={{ color: '#9CA3AF', fontSize: 11 }}>{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-600">Sin gastos registrados</div>
          )}
        </motion.div>

        {/* Transactions list */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#111111] border border-[#1E1E1E] rounded-2xl overflow-hidden"
        >
          <div className="p-5 border-b border-[#1E1E1E]">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Transacciones</h2>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3 animate-pulse">
              {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/5" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Sin transacciones aún</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[320px] divide-y divide-[#1E1E1E]">
              {entries.map((entry, idx) => {
                const meta = CATEGORY_META[entry.category] ?? CATEGORY_META.other
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + idx * 0.04 }}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/3 transition-colors group"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: `${meta.color}15` }}
                    >
                      {meta.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{entry.description}</p>
                      <p className="text-gray-500 text-xs">{entry.date} · <span className="capitalize">{entry.category}</span></p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${entry.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {entry.type === 'income' ? '+' : '-'}${entry.amount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleRemove(entry.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>

      <AddTransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAdd}
      />
    </div>
  )
}
