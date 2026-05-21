'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import XPFloat from '@/components/rpg/XPFloat';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import {
  Dumbbell,
  Plus,
  Trophy,
  BarChart2,
  CalendarDays,
  Clock,
  Weight,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  BarChart,
  Bar,
} from 'recharts';
import { gymApi } from '@/lib/api';
import type { GymSession, Exercise, PersonalRecord } from '@/types';
import QuickLogModal from '@/components/gym/QuickLogModal';
import ExerciseCard from '@/components/gym/ExerciseCard';

/* ─── Mock data ─────────────────────────────────────────────────────── */
const mockSessions: GymSession[] = [
  {
    id: '1',
    name: 'Push Day',
    date: new Date(Date.now() - 86400000).toISOString(),
    duration: 72,
    totalVolume: 8400,
    exercises: [
      { exerciseId: '1', exerciseName: 'Bench Press', muscleGroups: ['chest', 'triceps'], sets: [{ weight: 80, reps: 8, completed: true }, { weight: 80, reps: 7, completed: true }] },
      { exerciseId: '2', exerciseName: 'Overhead Press', muscleGroups: ['shoulders'], sets: [{ weight: 60, reps: 10, completed: true }] },
    ],
  },
  {
    id: '2',
    name: 'Pull Day',
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
    duration: 65,
    totalVolume: 7200,
    exercises: [
      { exerciseId: '3', exerciseName: 'Deadlift', muscleGroups: ['back', 'legs'], sets: [{ weight: 120, reps: 5, completed: true }] },
    ],
  },
];

const mockExercises: Exercise[] = [
  { id: '1', name: 'Bench Press', muscleGroups: ['chest', 'triceps'], lastPerformed: new Date(Date.now() - 86400000).toISOString(), lastWeight: 80, personalRecord: 92.5, recentWeights: [72, 75, 77.5, 80, 80, 82.5] },
  { id: '2', name: 'Squat', muscleGroups: ['legs', 'core'], lastPerformed: new Date(Date.now() - 2 * 86400000).toISOString(), lastWeight: 100, personalRecord: 115, recentWeights: [90, 95, 100, 100, 105, 100] },
  { id: '3', name: 'Deadlift', muscleGroups: ['back', 'legs'], lastPerformed: new Date(Date.now() - 3 * 86400000).toISOString(), lastWeight: 120, personalRecord: 140, recentWeights: [110, 115, 120, 120, 125, 120] },
  { id: '4', name: 'Overhead Press', muscleGroups: ['shoulders', 'arms'], lastPerformed: new Date(Date.now() - 86400000).toISOString(), lastWeight: 60, personalRecord: 70, recentWeights: [50, 55, 57.5, 60, 60, 60] },
  { id: '5', name: 'Pull-up', muscleGroups: ['back', 'arms'], lastPerformed: new Date(Date.now() - 4 * 86400000).toISOString(), lastWeight: 0, personalRecord: 0, recentWeights: [8, 9, 10, 10, 11, 12] },
  { id: '6', name: 'Dumbbell Row', muscleGroups: ['back', 'arms'], lastPerformed: new Date(Date.now() - 2 * 86400000).toISOString(), lastWeight: 36, personalRecord: 40, recentWeights: [30, 32, 34, 36, 36, 38] },
];

const mockRecords: PersonalRecord[] = [
  { id: '1', exerciseId: '1', exerciseName: 'Bench Press', weight: 92.5, reps: 1, date: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: '2', exerciseId: '2', exerciseName: 'Squat', weight: 115, reps: 1, date: new Date(Date.now() - 15 * 86400000).toISOString(), isNew: true },
  { id: '3', exerciseId: '3', exerciseName: 'Deadlift', weight: 140, reps: 1, date: new Date(Date.now() - 45 * 86400000).toISOString() },
  { id: '4', exerciseId: '4', exerciseName: 'Overhead Press', weight: 70, reps: 1, date: new Date(Date.now() - 20 * 86400000).toISOString(), isNew: true },
];

const volumeData = [
  { week: 'W1', volume: 18400 },
  { week: 'W2', volume: 22100 },
  { week: 'W3', volume: 19800 },
  { week: 'W4', volume: 25600 },
  { week: 'W5', volume: 24000 },
  { week: 'W6', volume: 28200 },
];

const muscleRadarData = [
  { subject: 'Chest', value: 85 },
  { subject: 'Back', value: 90 },
  { subject: 'Legs', value: 70 },
  { subject: 'Shoulders', value: 75 },
  { subject: 'Arms', value: 80 },
  { subject: 'Core', value: 60 },
];

const topExercisesData = [
  { name: 'Deadlift', sessions: 12 },
  { name: 'Bench', sessions: 14 },
  { name: 'Squat', sessions: 10 },
  { name: 'OHP', sessions: 11 },
  { name: 'Row', sessions: 9 },
];

/* ─── Loading Skeleton ──────────────────────────────────────────────── */
function GymSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 rounded-2xl bg-white/5" />
      ))}
    </div>
  );
}

/* ─── Week Calendar ─────────────────────────────────────────────────── */
function WeekCalendar({ sessions }: { sessions: GymSession[] }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    return d;
  });

  const sessionDates = new Set(sessions.map((s) => s.date.split('T')[0]));

  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-6">
      {days.map((day, i) => {
        const dateStr = day.toISOString().split('T')[0];
        const hasSession = sessionDates.has(dateStr);
        const isToday = dateStr === today.toISOString().split('T')[0];

        return (
          <div
            key={i}
            className={`rounded-xl p-3 text-center border transition-all ${
              isToday
                ? 'border-[#DC143C]/50 bg-[#DC143C]/10'
                : hasSession
                ? 'border-green-500/30 bg-green-500/10'
                : 'border-white/5 bg-white/3'
            }`}
          >
            <div className="text-xs text-gray-500 mb-1">{format(day, 'EEE')}</div>
            <div className={`text-sm font-bold ${isToday ? 'text-[#DC143C]' : 'text-gray-300'}`}>
              {format(day, 'd')}
            </div>
            {hasSession && <div className="w-1.5 h-1.5 rounded-full bg-green-400 mx-auto mt-1" />}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function GymPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [xpFloat, setXpFloat] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });

  const { data: sessionsData, isLoading: loadingSessions } = useQuery({
    queryKey: ['gym-sessions'],
    queryFn: async () => {
      const res = await gymApi.sessions();
      const raw: any[] = res.data?.sessions ?? res.data ?? [];
      // normalize backend shape: sessionExercises[].exercise → exercises[]
      return raw.map((s: any) => ({
        ...s,
        exercises: (s.exercises ?? s.sessionExercises ?? []).map((se: any) => ({
          exerciseId:   se.exercise?.id   ?? se.exerciseId   ?? '',
          exerciseName: se.exercise?.name ?? se.exerciseName ?? '',
          muscleGroups: se.exercise?.muscleGroups ?? se.muscleGroups ?? [],
          sets:         se.sets ?? [],
        })),
      })) as GymSession[];
    },
    placeholderData: mockSessions,
  });

  const { data: exercisesData } = useQuery({
    queryKey: ['gym-exercises'],
    queryFn: async () => {
      const res = await gymApi.exercises();
      return (res.data?.exercises ?? res.data) as Exercise[];
    },
    placeholderData: mockExercises,
  });

  const { data: recordsData } = useQuery({
    queryKey: ['gym-records'],
    queryFn: async () => {
      const res = await gymApi.records();
      return (res.data?.records ?? res.data) as PersonalRecord[];
    },
    placeholderData: mockRecords,
  });

  const sessionList  = Array.isArray(sessionsData)  ? sessionsData  : mockSessions;
  const exerciseList = Array.isArray(exercisesData) ? exercisesData : mockExercises;
  const recordList   = Array.isArray(recordsData)   ? recordsData   : mockRecords;

  return (
    <div className="space-y-6 pb-8 relative">
      {/* XP Float animation */}
      <XPFloat
        amount={xpFloat.amount}
        active={xpFloat.show}
        onComplete={() => setXpFloat((f) => ({ ...f, show: false }))}
        className="top-4 left-1/2"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 uppercase tracking-wide">
            <Dumbbell className="w-8 h-8 text-[#DC143C]" />
            Forja del Guerrero
          </h1>
          <p className="text-gray-500 mt-1">Forja tu cuerpo en el fuego del esfuerzo</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(220,20,60,0.4)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#DC143C] rounded-xl text-white font-semibold text-sm"
        >
          <Plus className="w-4 h-4" />
          Registrar Sesión
        </motion.button>
      </div>

      <Tabs.Root defaultValue="sessions">
        <Tabs.List className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10 mb-6 w-fit">
          {[
            { value: 'sessions', label: 'Hazañas', icon: CalendarDays },
            { value: 'exercises', label: 'Arsenal', icon: Dumbbell },
            { value: 'records', label: 'Leyendas', icon: Trophy },
            { value: 'stats', label: 'Estadísticas', icon: BarChart2 },
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

        {/* Sessions Tab */}
        <Tabs.Content value="sessions">
          <WeekCalendar sessions={sessionList} />

          {loadingSessions ? (
            <GymSkeleton />
          ) : (
            <div className="space-y-4">
              {sessionList.map((session, idx) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5 hover:border-[#DC143C]/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-bold text-lg">{session.name}</h3>
                      <p className="text-gray-500 text-sm">{format(new Date(session.date), 'EEEE, MMM d')}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-gray-400 text-sm">
                        <Clock className="w-3.5 h-3.5" />
                        {session.duration}m
                      </div>
                      <div className="flex items-center gap-1 text-gray-400 text-sm">
                        <Weight className="w-3.5 h-3.5" />
                        {(session.totalVolume / 1000).toFixed(1)}t vol.
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {session.exercises.map((ex) => (
                      <span key={ex.exerciseId} className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1 text-gray-400">
                        {ex.exerciseName} · {ex.sets.length}×
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}

              {sessionList.length === 0 && (
                <div className="text-center py-16 text-gray-600">
                  <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-semibold">Sin sesiones aún</p>
                  <p className="text-sm mt-1">Registra tu primera sesión arriba</p>
                </div>
              )}
            </div>
          )}
        </Tabs.Content>

        {/* Exercises Tab */}
        <Tabs.Content value="exercises">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exerciseList.map((ex, idx) => (
              <ExerciseCard key={ex.id} exercise={ex} delay={idx * 0.05} />
            ))}
          </div>
        </Tabs.Content>

        {/* Records Tab */}
        <Tabs.Content value="records">
          <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-4">Ejercicio</th>
                  <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-4">Peso</th>
                  <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-4">Reps</th>
                  <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-4">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recordList.map((rec, idx) => (
                  <motion.tr
                    key={rec.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`border-b border-white/5 hover:bg-white/3 transition-colors ${rec.isNew ? 'bg-yellow-400/5' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{rec.exerciseName}</span>
                        {rec.isNew && (
                          <span className="text-xs bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 rounded-full px-2 py-0.5 font-bold">
                            NUEVO
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-white font-bold text-lg">{rec.weight}</span>
                      <span className="text-gray-500 text-sm ml-1">kg</span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-300">{rec.reps}</td>
                    <td className="px-6 py-4 text-right text-gray-500 text-sm">
                      {format(new Date(rec.date), 'MMM d, yyyy')}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs.Content>

        {/* Stats Tab */}
        <Tabs.Content value="stats">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Volume over time */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6"
            >
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#DC143C]" />
                Volumen en el Tiempo
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={volumeData}>
                  <CartesianGrid stroke="#1A1A1A" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#111111', border: '1px solid #1A1A1A', borderRadius: 8, color: '#fff' }} />
                  <Line type="monotone" dataKey="volume" stroke="#DC143C" strokeWidth={2.5} dot={{ fill: '#DC143C', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Muscle group radar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6"
            >
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Frecuencia Muscular
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={muscleRadarData}>
                  <PolarGrid stroke="#1A1A1A" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <Radar dataKey="value" stroke="#DC143C" fill="#DC143C" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Top exercises */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6 lg:col-span-2"
            >
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Ejercicios Principales
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topExercisesData} barSize={40} margin={{ left: -20 }}>
                  <CartesianGrid stroke="#1A1A1A" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#111111', border: '1px solid #1A1A1A', borderRadius: 8, color: '#fff' }} />
                  <Bar dataKey="sessions" radius={[6, 6, 0, 0]} fill="#DC143C" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      <QuickLogModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onXP={(xp) => setXpFloat({ show: true, amount: xp })}
      />
    </div>
  );
}
