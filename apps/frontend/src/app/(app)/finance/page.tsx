'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, Plus, X, Trash2, TrendingUp, TrendingDown, CalendarDays,
  AlertCircle, CheckCircle2, CreditCard, ChevronDown, ChevronUp,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { api, financeApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'

/* ─── Types ──────────────────────────────────────────────────────── */
interface Debt {
  id: string
  label: string
  amount: number
  paid: number
  direction: 'owe' | 'owed'
  dueDate: string | null
  description: string | null
  createdAt: string
}

interface FinanceEntry {
  id: string
  date: string          // ISO string from backend, e.g. "2026-05-25T00:00:00.000Z"
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string
}

type Period = 'day' | 'week' | 'month'

const CATEGORY_META: Record<string, { emoji: string; color: string; label: string }> = {
  food:          { emoji: '🍔', color: '#F97316', label: 'Comida' },
  salary:        { emoji: '💼', color: '#22C55E', label: 'Sueldo' },
  fitness:       { emoji: '🏋️', color: '#DC143C', label: 'Fitness' },
  education:     { emoji: '📚', color: '#3B82F6', label: 'Educación' },
  transport:     { emoji: '🚗', color: '#8B5CF6', label: 'Transporte' },
  freelance:     { emoji: '💻', color: '#06B6D4', label: 'Freelance' },
  housing:       { emoji: '🏠', color: '#EC4899', label: 'Vivienda' },
  healthcare:    { emoji: '💊', color: '#F59E0B', label: 'Salud' },
  entertainment: { emoji: '🎬', color: '#A855F7', label: 'Ocio' },
  investment:    { emoji: '📈', color: '#10B981', label: 'Inversión' },
  other:         { emoji: '📦', color: '#6B7280', label: 'Otro' },
}

const EXPENSE_CATEGORIES = ['food', 'fitness', 'education', 'transport', 'housing', 'healthcare', 'entertainment', 'other']
const INCOME_CATEGORIES  = ['salary', 'freelance', 'investment', 'other']

/* ─── Date helpers (timezone-safe) ──────────────────────────────── */
function localDateStr(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function currentMonthPrefix() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function weekRange(): [string, string] {
  const d = new Date()
  const day = d.getDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const mon = new Date(d); mon.setDate(d.getDate() + diffToMon)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  return [fmt(mon), fmt(sun)]
}

function entryDay(e: FinanceEntry) {
  return e.date.slice(0, 10) // "2026-05-25" — avoids UTC/local shift issues
}

function filterByPeriod(entries: FinanceEntry[], period: Period) {
  const today  = localDateStr()
  const month  = currentMonthPrefix()
  const [wS, wE] = weekRange()
  return entries.filter((e) => {
    const d = entryDay(e)
    if (period === 'day')   return d === today
    if (period === 'week')  return d >= wS && d <= wE
    return d.startsWith(month)
  })
}

function formatDayLabel(dateStr: string) {
  const today     = localDateStr()
  const yesterday = localDateStr(-1)
  if (dateStr === today)     return 'Hoy'
  if (dateStr === yesterday) return 'Ayer'
  // Use noon to avoid DST/timezone shifting the date
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}

function groupByDay(entries: FinanceEntry[]) {
  const map = new Map<string, FinanceEntry[]>()
  for (const e of [...entries].sort((a, b) => b.date.localeCompare(a.date))) {
    const d = entryDay(e)
    if (!map.has(d)) map.set(d, [])
    map.get(d)!.push(e)
  }
  return Array.from(map.entries())
}

function fmtAmount(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/* ─── Pie tooltip ────────────────────────────────────────────────── */
function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl px-3 py-2 text-xs">
      <p className="text-white font-semibold">{payload[0].name}</p>
      <p className="text-gray-400">${fmtAmount(payload[0].value)}</p>
    </div>
  )
}

/* ─── Add Debt Modal ─────────────────────────────────────────────── */
function AddDebtModal({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void; onAdd: (data: object) => void
}) {
  const [form, setForm] = useState({
    direction: 'owe' as 'owe' | 'owed',
    label: '',
    amount: '',
    dueDate: '',
    description: '',
  })
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.label || !form.amount) return
    onAdd({ ...form, amount: Number(form.amount), dueDate: form.dueDate || null })
    setForm({ direction: 'owe', label: '', amount: '', dueDate: '', description: '' })
    onClose()
  }

  if (!open) return null
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Nueva deuda</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Direction */}
            <div className="flex gap-2">
              {(['owe', 'owed'] as const).map((d) => (
                <button
                  key={d} type="button" onClick={() => set('direction', d)}
                  className={`flex-1 py-3 rounded-xl border font-semibold text-sm transition-all ${
                    form.direction === d
                      ? d === 'owe'
                        ? 'bg-red-500/20 border-red-500/50 text-red-400'
                        : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'border-white/10 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {d === 'owe' ? 'Yo debo' : 'Me deben'}
                </button>
              ))}
            </div>

            <Input
              label={form.direction === 'owe' ? '¿A quién le debes?' : '¿Quién te debe?'}
              value={form.label}
              onChange={(e) => set('label', e.target.value)}
              placeholder="ej. Juan, Tarjeta Visa..."
            />
            <Input label="Monto ($)" type="number" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" />
            <Input label="Fecha límite (opcional)" type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            <Input label="Nota (opcional)" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="ej. Préstamo de emergencia" />

            <div className="flex gap-3 pt-1">
              <Button variant="secondary" fullWidth onClick={onClose} type="button">Cancelar</Button>
              <Button variant="primary" fullWidth type="submit" icon={<Plus className="w-4 h-4" />}>Agregar</Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ─── Pay Partial Modal ───────────────────────────────────────────── */
function PayModal({ debt, onClose, onPay }: {
  debt: Debt; onClose: () => void; onPay: (amount: number) => void
}) {
  const [amount, setAmount] = useState('')
  const remaining = debt.amount - debt.paid

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = Math.min(parseFloat(amount), remaining)
    if (!n || n <= 0) return
    onPay(n)
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Registrar pago</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Pendiente: <span className="text-white font-semibold">${fmtAmount(remaining)}</span> de ${fmtAmount(debt.amount)}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Monto pagado ($)"
              type="number" step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={fmtAmount(remaining)}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setAmount(String(remaining))}
                className="flex-1 py-2 rounded-xl border border-white/10 text-xs text-gray-400 hover:text-white hover:border-white/20 transition-all">
                Todo (${fmtAmount(remaining)})
              </button>
              <Button variant="primary" fullWidth type="submit">Confirmar</Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ─── Debt Card ──────────────────────────────────────────────────── */
function DebtCard({ debt, onPay, onRemove }: {
  debt: Debt
  onPay: (id: string, amount: number) => void
  onRemove: (id: string) => void
}) {
  const [payOpen, setPayOpen] = useState(false)
  const remaining = debt.amount - debt.paid
  const pct = Math.min(100, Math.round((debt.paid / debt.amount) * 100))
  const isPaid = remaining <= 0
  const isOverdue = debt.dueDate && !isPaid && new Date(debt.dueDate) < new Date()

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border p-4 space-y-3 ${
          isPaid
            ? 'bg-emerald-500/5 border-emerald-500/15'
            : isOverdue
              ? 'bg-red-500/5 border-red-500/20'
              : 'bg-[#111111] border-[#1A1A1A]'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl flex-shrink-0 ${
            isPaid ? 'bg-emerald-500/15' : debt.direction === 'owe' ? 'bg-red-500/10' : 'bg-emerald-500/10'
          }`}>
            {isPaid
              ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              : <CreditCard className={`w-4 h-4 ${debt.direction === 'owe' ? 'text-red-400' : 'text-emerald-400'}`} />
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white">{debt.label}</span>
              {isOverdue && (
                <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-2.5 h-2.5" /> Vencida
                </span>
              )}
              {isPaid && (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Pagada</span>
              )}
            </div>
            {debt.description && (
              <p className="text-xs text-gray-600 mt-0.5">{debt.description}</p>
            )}
            {debt.dueDate && !isPaid && (
              <p className="text-[10px] text-gray-600 mt-0.5">
                Vence: {new Date(debt.dueDate + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>

          <div className="text-right flex-shrink-0">
            <p className={`text-sm font-bold tabular-nums ${isPaid ? 'text-emerald-400' : debt.direction === 'owe' ? 'text-red-400' : 'text-gray-200'}`}>
              ${fmtAmount(remaining)}
            </p>
            <p className="text-[10px] text-gray-600">de ${fmtAmount(debt.amount)}</p>
          </div>
        </div>

        {/* Progress bar */}
        {debt.amount > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`h-full rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-[#DC143C]'}`}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] text-gray-600">Pagado {pct}%</span>
              {!isPaid && <span className="text-[10px] text-gray-600">Falta ${fmtAmount(remaining)}</span>}
            </div>
          </div>
        )}

        {/* Actions */}
        {!isPaid && (
          <div className="flex gap-2">
            <button
              onClick={() => setPayOpen(true)}
              className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white hover:border-white/20 font-semibold transition-all"
            >
              Registrar pago
            </button>
            <button
              onClick={() => onRemove(debt.id)}
              className="p-2 rounded-xl border border-white/5 text-gray-600 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
        {isPaid && (
          <button
            onClick={() => onRemove(debt.id)}
            className="w-full py-2 rounded-xl border border-white/5 text-xs text-gray-600 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all"
          >
            Eliminar
          </button>
        )}
      </motion.div>

      {payOpen && (
        <PayModal
          debt={debt}
          onClose={() => setPayOpen(false)}
          onPay={(amount) => onPay(debt.id, amount)}
        />
      )}
    </>
  )
}

/* ─── Add Transaction Modal ──────────────────────────────────────── */
function AddModal({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void; onAdd: (data: object) => void
}) {
  const [form, setForm] = useState({
    type: 'expense' as 'income' | 'expense',
    category: 'food',
    amount: '',
    description: '',
    date: localDateStr(),
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const cats = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount || !form.description) return
    onAdd({ ...form, amount: Number(form.amount) })
    setForm({ type: 'expense', category: 'food', amount: '', description: '', date: localDateStr() })
    onClose()
  }

  if (!open) return null
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
            <h2 className="text-lg font-bold text-white">Nueva transacción</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type */}
            <div className="flex gap-2">
              {(['expense', 'income'] as const).map((t) => (
                <button
                  key={t} type="button"
                  onClick={() => { set('type', t); set('category', t === 'income' ? 'salary' : 'food') }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm transition-all ${
                    form.type === t
                      ? t === 'income'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-red-500/20 border-red-500/50 text-red-400'
                      : 'border-white/10 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {t === 'income' ? 'Ingreso' : 'Gasto'}
                </button>
              ))}
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Categoría</label>
              <div className="grid grid-cols-4 gap-1.5">
                {cats.map((cat) => {
                  const meta = CATEGORY_META[cat] ?? CATEGORY_META.other
                  return (
                    <button
                      key={cat} type="button" onClick={() => set('category', cat)}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[10px] transition-all ${
                        form.category === cat
                          ? 'border-[#DC143C]/60 bg-[#DC143C]/10 text-white'
                          : 'border-white/[0.08] text-gray-500 hover:border-white/20 hover:text-gray-300'
                      }`}
                    >
                      <span className="text-base">{meta.emoji}</span>
                      <span className="truncate w-full text-center px-1">{meta.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <Input label="Fecha" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            <Input label="Monto ($)" type="number" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" />
            <Input label="Descripción" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="ej. Supermercado" />

            <div className="flex gap-3 pt-1">
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
  const [modalOpen, setModalOpen]     = useState(false)
  const [debtModalOpen, setDebtModalOpen] = useState(false)
  const [period, setPeriod]           = useState<Period>('month')
  const [debtTab, setDebtTab]         = useState<'owe' | 'owed'>('owe')
  const qc = useQueryClient()

  const { data: entriesData, isLoading } = useQuery({
    queryKey: ['finance-entries'],
    queryFn: async () => {
      const res = await api.get('/finance/entries?limit=500')
      return (res.data.entries ?? res.data) as FinanceEntry[]
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: object) => financeApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-entries'] })
      qc.invalidateQueries({ queryKey: ['rpg-character'] })
      qc.invalidateQueries({ queryKey: ['rpg-combo'] })
    },
    onError: () => toast.error('Error al guardar'),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => financeApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-entries'] }),
    onError: () => toast.error('Error al eliminar'),
  })

  /* ── Debts ── */
  const { data: debtsData } = useQuery({
    queryKey: ['finance-debts'],
    queryFn: async () => (await financeApi.debts()).data.debts as Debt[],
  })

  const createDebtMutation = useMutation({
    mutationFn: (data: object) => financeApi.createDebt(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance-debts'] }); toast.success('Deuda registrada') },
    onError: () => toast.error('Error al guardar'),
  })

  const payDebtMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => financeApi.payDebt(id, amount),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance-debts'] }); toast.success('Pago registrado') },
    onError: () => toast.error('Error al registrar pago'),
  })

  const removeDebtMutation = useMutation({
    mutationFn: (id: string) => financeApi.removeDebt(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-debts'] }),
    onError: () => toast.error('Error al eliminar'),
  })

  const entries = entriesData ?? []
  const debts   = debtsData ?? []

  function handleAdd(data: object) { createMutation.mutate(data) }
  function handleAddDebt(data: object) { createDebtMutation.mutate(data) }
  function handlePayDebt(id: string, amount: number) { payDebtMutation.mutate({ id, amount }) }
  function handleRemoveDebt(id: string) { removeDebtMutation.mutate(id) }

  /* ── Debt summaries ── */
  const oweDebts  = debts.filter((d) => d.direction === 'owe'  && d.paid < d.amount)
  const owedDebts = debts.filter((d) => d.direction === 'owed' && d.paid < d.amount)
  const totalOwe  = oweDebts.reduce((s, d) => s + (d.amount - d.paid), 0)
  const totalOwed = owedDebts.reduce((s, d) => s + (d.amount - d.paid), 0)
  const paidDebts = debts.filter((d) => d.paid >= d.amount)

  /* ── Period calculations ── */
  const dayEntries   = filterByPeriod(entries, 'day')
  const weekEntries  = filterByPeriod(entries, 'week')
  const monthEntries = filterByPeriod(entries, 'month')

  const daySpend   = dayEntries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const weekSpend  = weekEntries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const monthSpend = monthEntries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const monthIncome = monthEntries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const monthBalance = monthIncome - monthSpend

  /* ── Filtered view ── */
  const periodEntries = filterByPeriod(entries, period)
  const periodSpend   = periodEntries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const periodIncome  = periodEntries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const grouped       = groupByDay(periodEntries)

  /* ── Pie data (current month) ── */
  const pieData = EXPENSE_CATEGORIES.reduce((acc, cat) => {
    const total = monthEntries
      .filter((e) => e.type === 'expense' && e.category === cat)
      .reduce((s, e) => s + e.amount, 0)
    if (total > 0) acc.push({ name: CATEGORY_META[cat]?.label ?? cat, value: Number(total.toFixed(2)), color: CATEGORY_META[cat]?.color ?? '#6B7280' })
    return acc
  }, [] as { name: string; value: number; color: string }[])

  const PERIOD_LABELS: Record<Period, string> = { day: 'Hoy', week: 'Esta semana', month: 'Este mes' }

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Wallet className="w-7 h-7 text-[#DC143C]" />
            Finanzas
          </h1>
          <p className="text-gray-500 mt-1">Control de ingresos y gastos</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
          <span className="hidden sm:inline">Nueva transacción</span>
          <span className="sm:hidden">Añadir</span>
        </Button>
      </div>

      {/* ── Quick spending overview ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Hoy',     value: daySpend,   period: 'day'   as Period },
          { label: 'Semana',  value: weekSpend,  period: 'week'  as Period },
          { label: 'Mes',     value: monthSpend, period: 'month' as Period },
        ].map(({ label, value, period: p }) => (
          <motion.button
            key={p}
            whileTap={{ scale: 0.97 }}
            onClick={() => setPeriod(p)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-left rounded-2xl p-4 border transition-all ${
              period === p
                ? 'bg-[#DC143C]/10 border-[#DC143C]/30'
                : 'bg-[#111111] border-[#1A1A1A] hover:border-white/10'
            }`}
          >
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${period === p ? 'text-[#DC143C]' : 'text-gray-600'}`}>
              {label}
            </p>
            <p className="text-lg md:text-xl font-bold text-white leading-none">
              ${fmtAmount(value)}
            </p>
            <p className="text-[10px] text-gray-600 mt-1">
              {filterByPeriod(entries, p).filter((e) => e.type === 'expense').length} gastos
            </p>
          </motion.button>
        ))}
      </div>

      {/* ── Month balance ── */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-[#111111] border border-[#1A1A1A] rounded-2xl p-4 flex items-center gap-3"
        >
          <div className="p-2 rounded-xl bg-emerald-500/10 flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Ingresos del mes</p>
            <p className="text-base font-bold text-emerald-400 truncate">+${fmtAmount(monthIncome)}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={`bg-[#111111] border rounded-2xl p-4 flex items-center gap-3 ${
            monthBalance >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'
          }`}
        >
          <div className={`p-2 rounded-xl flex-shrink-0 ${monthBalance >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            <Wallet className={`w-4 h-4 ${monthBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Balance del mes</p>
            <p className={`text-base font-bold truncate ${monthBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {monthBalance >= 0 ? '+' : '-'}${fmtAmount(Math.abs(monthBalance))}
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Transactions + Pie side by side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Transaction list — takes 3/5 on large */}
        <div className="lg:col-span-3 bg-[#111111] border border-[#1A1A1A] rounded-2xl overflow-hidden">

          {/* Period tabs */}
          <div className="flex border-b border-[#1A1A1A]">
            {(['day', 'week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider transition-all ${
                  period === p
                    ? 'text-white border-b-2 border-[#DC143C]'
                    : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {/* Period totals bar */}
          {periodEntries.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 bg-white/[0.02] border-b border-[#1A1A1A]">
              {periodIncome > 0 && (
                <span className="text-xs text-emerald-400 font-semibold">+${fmtAmount(periodIncome)}</span>
              )}
              <span className={`text-xs font-semibold ml-auto ${periodSpend > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                -{periodSpend > 0 ? `$${fmtAmount(periodSpend)}` : '$0.00'}
              </span>
            </div>
          )}

          {/* Grouped transactions */}
          {isLoading ? (
            <div className="p-4 space-y-3 animate-pulse">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-white/5" />)}
            </div>
          ) : periodEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-600">
              <CalendarDays className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">Sin movimientos {PERIOD_LABELS[period].toLowerCase()}</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[420px]">
              {grouped.map(([day, dayItems]: [string, FinanceEntry[]]) => {
                const dayTotal = dayItems.filter((e: FinanceEntry) => e.type === 'expense').reduce((s: number, e: FinanceEntry) => s + e.amount, 0)
                return (
                  <div key={day}>
                    {/* Day header */}
                    <div className="flex items-center justify-between px-5 py-2 sticky top-0 bg-[#0E0E0E] border-b border-[#1A1A1A]">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        {formatDayLabel(day)}
                      </span>
                      {dayTotal > 0 && (
                        <span className="text-[10px] text-gray-600">-${fmtAmount(dayTotal)}</span>
                      )}
                    </div>

                    {/* Items */}
                    {dayItems.map((entry: FinanceEntry, idx: number) => {
                      const meta = CATEGORY_META[entry.category] ?? CATEGORY_META.other
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.03 }}
                          className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group border-b border-[#1A1A1A]/50 last:border-0"
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                            style={{ background: `${meta.color}15` }}
                          >
                            {meta.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-200 truncate">{entry.description || meta.label}</p>
                            <p className="text-[10px] text-gray-600 mt-0.5">{meta.label}</p>
                          </div>
                          <div className="flex items-center gap-2.5 flex-shrink-0">
                            <span className={`text-sm font-bold tabular-nums ${
                              entry.type === 'income' ? 'text-emerald-400' : 'text-gray-200'
                            }`}>
                              {entry.type === 'income' ? '+' : '-'}${fmtAmount(entry.amount)}
                            </span>
                            <button
                              onClick={() => removeMutation.mutate(entry.id)}
                              disabled={removeMutation.isPending}
                              className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all disabled:opacity-30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pie chart — 2/5 on large */}
        <div className="lg:col-span-2 bg-[#111111] border border-[#1A1A1A] rounded-2xl p-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            Gastos por categoría · mes
          </p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={52} outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((item, i) => (
                      <Cell key={i} fill={item.color} opacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="space-y-2 mt-3">
                {pieData.sort((a, b) => b.value - a.value).map((item) => {
                  const pct = monthSpend > 0 ? (item.value / monthSpend * 100).toFixed(0) : '0'
                  return (
                    <div key={item.name} className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-xs text-gray-400 flex-1 truncate">{item.name}</span>
                      <span className="text-xs text-gray-600 tabular-nums">{pct}%</span>
                      <span className="text-xs text-gray-300 font-medium tabular-nums w-20 text-right">
                        ${fmtAmount(item.value)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
              Sin gastos este mes
            </div>
          )}
        </div>
      </div>

      {/* ── Debts section ── */}
      <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl overflow-hidden">

        {/* Debts header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-3">
            <CreditCard className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-bold text-white">Deudas</span>
            {(oweDebts.length + owedDebts.length) > 0 && (
              <span className="text-[10px] bg-white/5 text-gray-500 px-2 py-0.5 rounded-full">
                {oweDebts.length + owedDebts.length} activas
              </span>
            )}
          </div>
          <button
            onClick={() => setDebtModalOpen(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-xl transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Nueva
          </button>
        </div>

        {/* Debt summary chips */}
        {(totalOwe > 0 || totalOwed > 0) && (
          <div className="flex gap-3 px-5 py-3 border-b border-[#1A1A1A] bg-white/[0.01]">
            {totalOwe > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs text-gray-500">Debes</span>
                <span className="text-xs font-bold text-red-400">${fmtAmount(totalOwe)}</span>
              </div>
            )}
            {totalOwe > 0 && totalOwed > 0 && <div className="w-px bg-white/5" />}
            {totalOwed > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-500">Te deben</span>
                <span className="text-xs font-bold text-emerald-400">${fmtAmount(totalOwed)}</span>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[#1A1A1A]">
          {([['owe', 'Yo debo', oweDebts.length], ['owed', 'Me deben', owedDebts.length]] as const).map(([tab, label, count]) => (
            <button
              key={tab}
              onClick={() => setDebtTab(tab)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                debtTab === tab ? 'text-white border-b-2 border-[#DC143C]' : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  debtTab === tab ? 'bg-[#DC143C]/20 text-[#DC143C]' : 'bg-white/5 text-gray-600'
                }`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Debt list */}
        <div className="p-4 space-y-3">
          {(debtTab === 'owe' ? oweDebts : owedDebts).length === 0 && paidDebts.length === 0 ? (
            <div className="py-8 text-center text-gray-600 text-sm">
              {debtTab === 'owe' ? 'No tienes deudas pendientes' : 'Nadie te debe dinero'}
            </div>
          ) : (
            <>
              {(debtTab === 'owe' ? oweDebts : owedDebts).map((debt) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  onPay={handlePayDebt}
                  onRemove={handleRemoveDebt}
                />
              ))}
              {(debtTab === 'owe' ? oweDebts : owedDebts).length === 0 && (
                <div className="py-6 text-center text-gray-600 text-sm">
                  {debtTab === 'owe' ? 'No tienes deudas pendientes' : 'Nadie te debe dinero'}
                </div>
              )}
              {/* Paid debts (collapsed) */}
              {paidDebts.filter((d) => d.direction === debtTab).length > 0 && (
                <div className="border-t border-[#1A1A1A] pt-3 mt-3">
                  <p className="text-[10px] text-gray-700 uppercase tracking-wider mb-2">Saldadas</p>
                  {paidDebts.filter((d) => d.direction === debtTab).map((debt) => (
                    <DebtCard key={debt.id} debt={debt} onPay={handlePayDebt} onRemove={handleRemoveDebt} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AddModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={handleAdd} />
      <AddDebtModal open={debtModalOpen} onClose={() => setDebtModalOpen(false)} onAdd={handleAddDebt} />
    </div>
  )
}
