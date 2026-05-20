'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, X, Loader2, Sparkles, Check } from 'lucide-react'
import { learningApi } from '@/lib/api'
import toast from 'react-hot-toast'

/* ─── Types ──────────────────────────────────────────────────────── */
interface Interest { id: string; name: string }
interface Item     { id: string; tag: string; title: string; completed: boolean }

/* ─── Page ────────────────────────────────────────────────────────── */
export default function LearningPage() {
  const [newInterest, setNewInterest] = useState('')
  const [generating, setGenerating]   = useState(false)
  const qc = useQueryClient()

  /* ── Queries ── */
  const { data: interestsData } = useQuery({
    queryKey: ['learning-interests'],
    queryFn: async () => (await learningApi.interests()).data.interests as Interest[],
  })

  const { data: itemsData, isLoading: loadingItems } = useQuery({
    queryKey: ['learning-items'],
    queryFn: async () => (await learningApi.items()).data.items as Item[],
  })

  /* ── Mutations ── */
  const addInterestMutation = useMutation({
    mutationFn: (name: string) => learningApi.addInterest(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['learning-interests'] }),
  })

  const removeInterestMutation = useMutation({
    mutationFn: (id: string) => learningApi.removeInterest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['learning-interests'] }),
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
    onError: (_err, _id, ctx) => qc.setQueryData(['learning-items'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['learning-items'] }),
  })

  /* ── Handlers ── */
  function handleAddInterest() {
    const name = newInterest.trim()
    if (!name) return
    addInterestMutation.mutate(name)
    setNewInterest('')
  }

  async function handleGenerate() {
    const interests = interestsData ?? []
    if (interests.length === 0) { toast.error('Agrega al menos un interés primero'); return }
    setGenerating(true)
    try {
      await learningApi.generate(interests.map((i) => i.name))
      qc.invalidateQueries({ queryKey: ['learning-items'] })
      toast.success('¡Sugerencias generadas!')
    } catch {
      toast.error('Error al generar')
    } finally {
      setGenerating(false)
    }
  }

  const interests = interestsData ?? []
  const items     = itemsData ?? []
  const pending   = items.filter((i) => !i.completed)
  const done      = items.filter((i) => i.completed)

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-[#DC143C]" />
            Aprendizaje
          </h1>
          <p className="text-gray-500 mt-1">Cosas que quieres aprender</p>
        </div>
      </div>

      {/* Intereses */}
      <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl p-5 space-y-4">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Mis intereses</p>

        {/* Chips */}
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {interests.map((interest) => (
              <motion.div
                key={interest.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#DC143C]/15 border border-[#DC143C]/25 rounded-full text-sm text-white"
              >
                {interest.name}
                <button
                  onClick={() => removeInterestMutation.mutate(interest.id)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input para agregar */}
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

        {/* Botón generar */}
        <motion.button
          whileHover={interests.length > 0 ? { scale: 1.01 } : {}}
          whileTap={interests.length > 0 ? { scale: 0.98 } : {}}
          onClick={handleGenerate}
          disabled={interests.length === 0 || generating}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            interests.length > 0
              ? 'bg-[#DC143C] text-white'
              : 'bg-white/5 text-gray-600 cursor-not-allowed'
          }`}
          style={interests.length > 0 ? { boxShadow: '0 0 16px rgba(220,20,60,0.3)' } : {}}
        >
          {generating
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
            : <><Sparkles className="w-4 h-4" /> Generar sugerencias</>
          }
        </motion.button>
      </div>

      {/* Lista de items pendientes */}
      {loadingItems ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-white/5" />)}
        </div>
      ) : pending.length === 0 && done.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Agrega tus intereses y genera sugerencias</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pendientes */}
          {pending.length > 0 && (
            <div className="space-y-2">
              {pending.map((item, idx) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleMutation.mutate(item.id)}
                  className="w-full flex items-center gap-3 bg-[#111111] border border-[#1A1A1A] rounded-xl px-4 py-3.5 text-left hover:border-white/10 transition-all group"
                >
                  <div className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0 group-hover:border-white/40 transition-colors" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-200">{item.title}</span>
                    <span className="ml-2 text-[10px] text-gray-600 bg-white/5 rounded-full px-2 py-0.5">{item.tag}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {/* Completados */}
          {done.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider px-1">Completados</p>
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
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
