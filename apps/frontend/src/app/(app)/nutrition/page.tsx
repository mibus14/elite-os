'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Apple, Plus, Droplets, X, Flame, Beef, Wheat, Droplet } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { nutritionApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CircleProgress, Progress } from '@/components/ui/Progress'
import { cn } from '@/lib/utils'

const DAILY_GOALS = { calories: 2200, protein: 160, carbs: 280, fat: 75 }

const MOCK_MEALS = [
  { id:'1', mealType:'breakfast', name:'Avocado Toast + Eggs', calories:480, protein:24, carbs:38, fat:22 },
  { id:'2', mealType:'breakfast', name:'Greek Yogurt', calories:150, protein:17, carbs:12, fat:3 },
  { id:'3', mealType:'lunch', name:'Grilled Chicken + Rice', calories:620, protein:52, carbs:68, fat:14 },
  { id:'4', mealType:'lunch', name:'Mixed Salad', calories:180, protein:8, carbs:15, fat:9 },
  { id:'5', mealType:'dinner', name:'Salmon + Sweet Potato', calories:580, protein:45, carbs:42, fat:18 },
]

const WEEK_DATA = [
  { day: 'Mon', calories: 2180, protein: 155, carbs: 270, fat: 72 },
  { day: 'Tue', calories: 1950, protein: 140, carbs: 245, fat: 68 },
  { day: 'Wed', calories: 2310, protein: 168, carbs: 295, fat: 78 },
  { day: 'Thu', calories: 2050, protein: 152, carbs: 260, fat: 70 },
  { day: 'Fri', calories: 2200, protein: 160, carbs: 280, fat: 75 },
  { day: 'Sat', calories: 1800, protein: 130, carbs: 228, fat: 62 },
  { day: 'Sun', calories: 2400, protein: 175, carbs: 310, fat: 80 },
]

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks']
const MEAL_ICONS: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snacks: '🍎' }

interface Meal { id: string; mealType: string; name: string; calories: number; protein: number; carbs: number; fat: number }

interface AddMealForm { mealType: string; name: string; calories: string; protein: string; carbs: string; fat: string }

const TOOLTIP_STYLE = { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: 8, color: '#fff', fontSize: 12 }

export default function NutritionPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<AddMealForm>({ mealType: 'breakfast', name: '', calories: '', protein: '', carbs: '', fat: '' })
  const [water, setWater] = useState(6)

  const { data, isLoading } = useQuery({
    queryKey: ['nutrition', 'today'],
    queryFn: async () => { const r = await nutritionApi.today(); return r.data },
  })

  const addMutation = useMutation({
    mutationFn: (d: object) => nutritionApi.addMeal(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['nutrition'] }); setShowModal(false) },
  })

  const meals: Meal[] = data?.meals ?? MOCK_MEALS
  const totals = meals.reduce((acc, m) => ({
    calories: acc.calories + m.calories,
    protein:  acc.protein  + m.protein,
    carbs:    acc.carbs    + m.carbs,
    fat:      acc.fat      + m.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addMutation.mutate({ ...form, calories: +form.calories, protein: +form.protein, carbs: +form.carbs, fat: +form.fat })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-white">Nutrition</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track your macros and fuel your gains</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowModal(true)}>Log Meal</Button>
      </div>

      {/* Daily Summary */}
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-5">Today's Summary</h2>
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-shrink-0">
            <CircleProgress
              value={totals.calories}
              max={DAILY_GOALS.calories}
              size={120}
              strokeWidth={8}
              color="#DC143C"
              label={
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{totals.calories}</p>
                  <p className="text-xs text-gray-500">kcal</p>
                </div>
              }
            />
          </div>
          <div className="flex-1 space-y-3 w-full">
            {[
              { label:'Protein', value:totals.protein, goal:DAILY_GOALS.protein, color:'blue' as const, icon:<Beef size={14}/> },
              { label:'Carbs',   value:totals.carbs,   goal:DAILY_GOALS.carbs,   color:'gold' as const, icon:<Wheat size={14}/> },
              { label:'Fat',     value:totals.fat,     goal:DAILY_GOALS.fat,     color:'red' as const,  icon:<Droplet size={14}/> },
            ].map(m => (
              <div key={m.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400 flex items-center gap-1">{m.icon}{m.label}</span>
                  <span className="text-gray-300">{m.value}g / {m.goal}g</span>
                </div>
                <Progress value={m.value} max={m.goal} color={m.color} size="sm" animated />
              </div>
            ))}
          </div>
          {/* Water tracker */}
          <div className="flex flex-col items-center gap-2">
            <Droplets size={20} className="text-blue-400" />
            <p className="text-sm font-bold text-white">{water}/10</p>
            <div className="grid grid-cols-5 gap-1">
              {Array.from({length:10}).map((_,i) => (
                <button key={i} onClick={() => setWater(i+1)}
                  className={cn('w-6 h-8 rounded-sm transition-all', i < water ? 'bg-blue-500' : 'bg-white/5 hover:bg-blue-900/40')}
                />
              ))}
            </div>
            <p className="text-[10px] text-gray-500">glasses</p>
          </div>
        </div>
      </motion.div>

      {/* Meal Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MEAL_TYPES.map((type, ti) => {
          const typeMeals = meals.filter(m => m.mealType === type)
          const typeCalories = typeMeals.reduce((s,m) => s+m.calories, 0)
          return (
            <motion.div key={type} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:ti*0.08}}
              className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{MEAL_ICONS[type]}</span>
                  <span className="text-sm font-semibold text-white capitalize">{type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{typeCalories} kcal</span>
                  <button onClick={() => { setForm(f => ({...f, mealType:type})); setShowModal(true) }}
                    className="p-1 rounded-lg bg-elite-600/10 text-elite-600 hover:bg-elite-600/20 transition-all">
                    <Plus size={12}/>
                  </button>
                </div>
              </div>
              {typeMeals.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">No meals logged</p>
              ) : (
                <div className="space-y-2">
                  {typeMeals.map(m => (
                    <div key={m.id} className="flex items-center justify-between py-2 border-b border-[#1A1A1A] last:border-0">
                      <div>
                        <p className="text-sm text-white">{m.name}</p>
                        <p className="text-[11px] text-gray-500">P:{m.protein}g · C:{m.carbs}g · F:{m.fat}g</p>
                      </div>
                      <span className="text-sm font-bold text-elite-600 flex items-center gap-1">
                        <Flame size={11}/>{m.calories}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Weekly Chart */}
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.4}}
        className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Weekly Macros</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={WEEK_DATA} barSize={8} barGap={2}>
            <XAxis dataKey="day" tick={{fill:'#666',fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis hide/>
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{fill:'rgba(255,255,255,0.03)'}}/>
            <Legend wrapperStyle={{fontSize:11,color:'#888'}}/>
            <Bar dataKey="protein" name="Protein" fill="#3B82F6" radius={[3,3,0,0]}/>
            <Bar dataKey="carbs"   name="Carbs"   fill="#F59E0B" radius={[3,3,0,0]}/>
            <Bar dataKey="fat"     name="Fat"     fill="#EF4444" radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Add Meal Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}}
              className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 w-full max-w-md shadow-[0_8px_64px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white font-heading">Log Meal</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X size={18}/></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1.5">Meal Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {MEAL_TYPES.map(t => (
                      <button type="button" key={t} onClick={() => setForm(f=>({...f,mealType:t}))}
                        className={cn('py-2 rounded-xl text-xs font-medium transition-all capitalize',
                          form.mealType===t ? 'bg-elite-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10')}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <Input label="Food Name" placeholder="e.g. Grilled Chicken" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required/>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Calories" type="number" placeholder="420" value={form.calories} onChange={e=>setForm(f=>({...f,calories:e.target.value}))}/>
                  <Input label="Protein (g)" type="number" placeholder="35" value={form.protein} onChange={e=>setForm(f=>({...f,protein:e.target.value}))}/>
                  <Input label="Carbs (g)" type="number" placeholder="45" value={form.carbs} onChange={e=>setForm(f=>({...f,carbs:e.target.value}))}/>
                  <Input label="Fat (g)" type="number" placeholder="12" value={form.fat} onChange={e=>setForm(f=>({...f,fat:e.target.value}))}/>
                </div>
                <Button type="submit" fullWidth loading={addMutation.isPending}>Add Meal</Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
