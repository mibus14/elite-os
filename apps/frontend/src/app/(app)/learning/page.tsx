'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Plus, X, Loader2, Sparkles, Check, RefreshCw, Trash2,
} from 'lucide-react'
import { learningApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface Interest  { id: string; name: string }
interface Item      { id: string; tag: string; title: string; completed: boolean }
interface Suggestion { tag: string; title: string; selected: boolean }

export default function LearningPage() {
  const [newInterest, setNewInterest]           = useState('')
  const [suggestions, setSuggestions]           = useState<Suggestion[]>([])
  const [generatingFor, setGeneratingFor]       = useState<string | null>(null)
  const [lastInterest, setLastInterest]         = useState<string | null>(null)
  const [saving, setSaving]                     = useState(false)
  const variationMap = useRef<Map<string, number>>(new Map())
  const qc = useQueryClient()

  /* ── Queries ── */
  const { data: interestsData } = useQuery({
    queryKey: ['learning-interests'],
    queryFn:  async () => (await learningApi.interests()).data.interests as Interest[],
  })

  const { data: itemsData, isLoading: loadingItems } = useQuery({
    queryKey: ['learning-items'],
    queryFn:  async () => (await learningApi.items()).data.items as Item[],
  })

  /* ── Mutations ── */
  const addInterestMutation = useMutation({
    mutationFn: (name: string) => learningApi.addInterest(name),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['learning-interests'] }),
  })

  const removeInterestMutation = useMutation({
    mutationFn: (id: string) => learningApi.removeInterest(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['learning-interests'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => learningApi.deleteItem(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['learning-items'] })
      const prev = qc.getQueryData<Item[]>(['learning-items'])
      qc.setQueryData(['learning-items'], (old: Item[] = []) => old.filter((i) => i.id !== id))
      return { prev }
    },
    onError:   (_err, _id, ctx) => qc.setQueryData(['learning-items'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['learning-items'] }),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => learningApi.toggleItem(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['learning-items'] })
      const prev = qc.getQueryData<Item[]>(['learning-items'])
      qc.setQueryData(['learning-items'], (old: Item[] = []) =>
        old.map((i) => i.id === id ? { ...i, completed: !i.completed } : i)
      )
      return { prev }
    },
    onError:   (_err, _id, ctx) => qc.setQueryData(['learning-items'], ctx?.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['learning-items'] })
      qc.invalidateQueries({ queryKey: ['rpg-character'] })
      qc.invalidateQueries({ queryKey: ['rpg-combo'] })
    },
  })

  /* ── Handlers ── */
  function handleAddInterest() {
    const raw = newInterest.trim()
    if (!raw) return
    raw.split(',').map((s) => s.trim()).filter(Boolean).forEach((name) => addInterestMutation.mutate(name))
    setNewInterest('')
  }

  async function handleGenerateFor(interestName: string, isRegenerate = false) {
    const seed = isRegenerate
      ? (variationMap.current.set(interestName, (variationMap.current.get(interestName) ?? 0) + 1),
         variationMap.current.get(interestName)!)
      : variationMap.current.get(interestName) ?? 0

    setGeneratingFor(interestName)
    setLastInterest(interestName)
    setSuggestions([])
    try {
      const existingTitles = [
        ...(itemsData ?? []).map((i) => i.title),
        ...suggestions.map((s) => s.title),
      ]
      const res = await learningApi.generate([interestName], {
        excludeTitles: existingTitles,
        variationSeed: seed,
      })
      const raw: Omit<Suggestion, 'selected'>[] = res.data.suggestions ?? []
      setSuggestions(raw.map((s) => ({ ...s, selected: true })))
    } catch {
      toast.error('Error al generar ideas')
    } finally {
      setGeneratingFor(null)
    }
  }

  function toggleSuggestion(idx: number) {
    setSuggestions((prev) => prev.map((s, i) => i === idx ? { ...s, selected: !s.selected } : s))
  }

  async function handleAddSelected() {
    const chosen = suggestions.filter((s) => s.selected)
    if (chosen.length === 0) { toast.error('Selecciona al menos una'); return }
    setSaving(true)
    try {
      await learningApi.addItems(chosen.map(({ tag, title }) => ({ tag, title })))
      qc.invalidateQueries({ queryKey: ['learning-items'] })
      toast.success(`${chosen.length} idea${chosen.length !== 1 ? 's' : ''} añadida${chosen.length !== 1 ? 's' : ''}`)
      setSuggestions([])
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const interests      = interestsData ?? []
  const items          = itemsData ?? []
  const pending        = items.filter((i) => !i.completed)
  const done           = items.filter((i) => i.completed)
  const selectedCount  = suggestions.filter((s) => s.selected).length

  /* ── Render ── */
  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-[#DC143C]" />
          Grimorio
        </h1>
        <p className="text-gray-500 mt-1">Genera ideas de estudio para cada uno de tus intereses</p>
      </div>

      {/* Intereses */}
      <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl p-5 space-y-4">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Mis intereses</p>

        {/* Interest chips */}
        {interests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {interests.map((interest) => {
                const isLoading = generatingFor === interest.name
                return (
                  <motion.div
                    key={interest.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1 pl-3 pr-1 py-1.5 bg-[#DC143C]/10 border border-[#DC143C]/20 rounded-full text-sm text-white"
                  >
                    <span className="mr-1">{interest.name}</span>

                    {/* Generate 3 ideas for this interest */}
                    <button
                      onClick={() => handleGenerateFor(interest.name, false)}
                      disabled={!!generatingFor}
                      title={`Generar 3 ideas sobre ${interest.name}`}
                      className="p-1 rounded-full hover:bg-[#DC143C]/30 text-[#DC143C] disabled:opacity-40 transition-all"
                    >
                      {isLoading
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Sparkles className="w-3.5 h-3.5" />
                      }
                    </button>

                    {/* Remove interest */}
                    <button
                      onClick={() => removeInterestMutation.mutate(interest.id)}
                      className="p-1 rounded-full text-gray-600 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Add interest input */}
        <div className="flex gap-2">
          <input
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddInterest()}
            placeholder="ej. guitarra, Python, inglés, cocina..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#DC143C]/50 transition-all"
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleAddInterest}
            disabled={!newInterest.trim()}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-40 transition-all"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        </div>

        {interests.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-2">
            Agrega un interés y toca <Sparkles className="inline w-3 h-3 text-[#DC143C]" /> para generar 3 ideas de estudio
          </p>
        )}
      </div>

      {/* Suggestions panel */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="bg-[#111111] border border-[#DC143C]/20 rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#DC143C] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Ideas para {lastInterest}
                </p>
                <p className="text-[10px] text-gray-600 mt-0.5">{selectedCount}/{suggestions.length} seleccionadas</p>
              </div>
              <button
                onClick={() => lastInterest && handleGenerateFor(lastInterest, true)}
                disabled={!!generatingFor}
                title="Generar 3 ideas distintas"
                className="p-2 rounded-xl border border-white/10 text-gray-500 hover:text-white hover:border-white/20 disabled:opacity-40 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${generatingFor ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-2">
              {suggestions.map((s, idx) => (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => toggleSuggestion(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    s.selected
                      ? 'bg-[#DC143C]/10 border-[#DC143C]/30'
                      : 'bg-white/[0.03] border-white/[0.05] opacity-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    s.selected ? 'border-[#DC143C] bg-[#DC143C]' : 'border-gray-600'
                  }`}>
                    {s.selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-200">{s.title}</span>
                    <span className="ml-2 text-[10px] text-gray-600 bg-white/5 rounded-full px-2 py-0.5">{s.tag}</span>
                  </div>
                </motion.button>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleAddSelected}
              disabled={selectedCount === 0 || saving}
              className="w-full py-3 rounded-xl bg-[#DC143C] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
              style={{ boxShadow: selectedCount > 0 ? '0 0 16px rgba(220,20,60,0.3)' : 'none' }}
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
                : <><Check className="w-4 h-4" />Añadir {selectedCount > 0 ? `${selectedCount} ` : ''}al Grimorio</>
              }
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Items list */}
      {loadingItems ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-white/5" />)}
        </div>
      ) : pending.length === 0 && done.length === 0 && suggestions.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Agrega un interés y genera tus primeras ideas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider px-1">
                Por aprender ({pending.length})
              </p>
              {pending.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-2 group"
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleMutation.mutate(item.id)}
                    className="w-10 h-[52px] flex items-center justify-center bg-[#111111] border border-[#1A1A1A] rounded-xl hover:border-white/10 transition-all flex-shrink-0"
                  >
                    <div className="w-5 h-5 rounded-full border border-white/20 group-hover:border-white/40 transition-colors" />
                  </button>

                  {/* Title */}
                  <div className="flex-1 flex items-center gap-3 bg-[#111111] border border-[#1A1A1A] rounded-xl px-4 py-3.5">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-200">{item.title}</span>
                      <span className="ml-2 text-[10px] text-gray-600 bg-white/5 rounded-full px-2 py-0.5">{item.tag}</span>
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteMutation.mutate(item.id)}
                    disabled={deleteMutation.isPending}
                    className="w-9 h-9 rounded-xl border border-white/5 bg-white/[0.03] text-gray-600 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {done.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider px-1">
                Completados ({done.length})
              </p>
              {done.map((item) => (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleMutation.mutate(item.id)}
                  className="w-full flex items-center gap-3 bg-[#111111] border border-[#1A1A1A] rounded-xl px-4 py-3.5 text-left opacity-50"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                  <span className="text-sm text-gray-500 line-through">{item.title}</span>
                  <span className="ml-1 text-[10px] text-gray-700 bg-white/5 rounded-full px-2 py-0.5">{item.tag}</span>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
