'use client';

import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { rpgApi } from '@/lib/api';
import type { RPGCharacter, RPGComboModule } from '@/types';

/* ─── Default modules (shown when API has no data) ──────────────── */
const DEFAULT_MODULES: RPGComboModule[] = [
  { key: 'gym',       label: 'Gym',         icon: '🏋️', completed: false },
  { key: 'nutrition', label: 'Nutrición',   icon: '🥗', completed: false },
  { key: 'habits',    label: 'Hábitos',     icon: '🧠', completed: false },
  { key: 'cardio',    label: 'Cardio',      icon: '🏃', completed: false },
  { key: 'learning',  label: 'Aprendizaje', icon: '📚', completed: false },
  { key: 'finance',   label: 'Finanzas',    icon: '💰', completed: false },
];

const MOCK_CHARACTER: RPGCharacter = {
  inPenitence: false,
  debuffs: [],
  comboActive: false,
  comboModulesCompleted: 2,
  comboModulesRequired: 3,
  comboModules: DEFAULT_MODULES.map((m, i) => ({ ...m, completed: i < 2 })),
};

/* ─── Fire particles (shown only when combo is active) ─────────── */
function FireParticles() {
  const particles = Array.from({ length: 12 });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute bottom-0 w-1 rounded-full"
          style={{
            left: `${(i / particles.length) * 100}%`,
            height: `${12 + Math.random() * 16}px`,
            background:
              'linear-gradient(to top, #EAB308, #F97316, transparent)',
          }}
          animate={{
            y: [0, -(20 + i * 4), 0],
            opacity: [0, 0.7, 0],
            scaleX: [1, 0.4, 1],
          }}
          transition={{
            duration: 1.2 + (i % 4) * 0.3,
            repeat: Infinity,
            delay: (i * 0.15) % 1.2,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

/* ─── Module Row ────────────────────────────────────────────────── */
function ModuleRow({ mod }: { mod: RPGComboModule }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-300 flex items-center gap-2">
        <span>{mod.icon}</span>
        <span>{mod.label}</span>
      </span>
      {mod.completed ? (
        <span className="text-xs font-semibold text-green-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          Completado
        </span>
      ) : (
        <span className="text-xs text-gray-600 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-700 inline-block" />
          Pendiente
        </span>
      )}
    </div>
  );
}

/* ─── ComboCard ─────────────────────────────────────────────────── */
export default function ComboCard() {
  const { data } = useQuery<RPGCharacter>({
    queryKey: ['rpg-character'],
    queryFn: () => rpgApi.character().then((r) => r.data.character as RPGCharacter),
    staleTime: 60_000,
    retry: false,
  });

  const character = data ?? MOCK_CHARACTER;
  const {
    comboActive,
    comboModulesCompleted,
    comboModulesRequired,
    comboModules,
  } = character;

  const modules =
    comboModules && comboModules.length > 0 ? comboModules : DEFAULT_MODULES;
  const completed = comboModulesCompleted ?? 0;
  const required = comboModulesRequired ?? 3;
  const progressPct = Math.min(100, (completed / required) * 100);
  const remaining = Math.max(0, required - completed);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="relative rounded-2xl border p-6 overflow-hidden transition-all duration-500"
      style={
        comboActive
          ? {
              borderColor: '#EAB308',
              boxShadow: '0 0 30px rgba(234,179,8,0.4)',
              background:
                'linear-gradient(135deg, #1a1200 0%, #0d0d00 50%, #111111 100%)',
            }
          : {
              borderColor: '#1E1E1E',
              background: '#111111',
            }
      }
    >
      {/* Fire particles (only when combo active) */}
      {comboActive && <FireParticles />}

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <h3
            className="text-sm font-black uppercase tracking-widest"
            style={{ color: comboActive ? '#EAB308' : '#9CA3AF' }}
          >
            Combo del Día
          </h3>
        </div>
        {comboActive ? (
          <motion.span
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full"
            style={{
              color: '#EAB308',
              background: 'rgba(234,179,8,0.15)',
              border: '1px solid rgba(234,179,8,0.3)',
            }}
          >
            COMBO ACTIVO — x2 XP
          </motion.span>
        ) : (
          <span className="text-xs text-gray-600 font-medium">
            Completa {required} módulos = x2 XP
          </span>
        )}
      </div>

      {/* Module list */}
      <div className="relative z-10 space-y-0.5 mb-5">
        {modules.map((mod) => (
          <ModuleRow key={mod.key} mod={mod} />
        ))}
      </div>

      {/* Progress bar */}
      <div className="relative z-10">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: comboActive
                ? 'linear-gradient(90deg, #92400e, #EAB308)'
                : 'linear-gradient(90deg, #7f1d1d, #DC143C)',
            }}
          />
        </div>
        <p className="text-xs text-gray-500">
          {comboActive ? (
            <span style={{ color: '#EAB308' }} className="font-semibold">
              ¡Combo activado! Gana el doble de XP hoy
            </span>
          ) : remaining === 1 ? (
            <span className="text-yellow-500">
              ¡1 más para activar el combo!
            </span>
          ) : (
            <>
              <span className="text-white font-semibold">
                {completed}/{required}
              </span>{' '}
              módulos — faltan{' '}
              <span className="text-white font-semibold">{remaining}</span> para
              el combo
            </>
          )}
        </p>
      </div>
    </motion.div>
  );
}
