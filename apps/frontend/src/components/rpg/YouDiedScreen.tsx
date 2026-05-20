'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { rpgApi } from '@/lib/api';

interface YouDiedScreenProps {
  onDismiss?: () => void;
}

export default function YouDiedScreen({ onDismiss }: YouDiedScreenProps) {
  const [showMission, setShowMission] = useState(false);
  const queryClient = useQueryClient();

  // After 3 seconds, fade in the penitence mission card
  useEffect(() => {
    const timer = setTimeout(() => setShowMission(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const { mutate: acceptPenitence, isPending } = useMutation({
    mutationFn: () => rpgApi.penitence(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rpg-character'] });
      toast.success('¡Tu alma fue liberada! Completa 3 hábitos.', {
        duration: 5000,
        style: {
          background: '#1a0000',
          border: '1px solid #DC143C',
          color: '#fff',
        },
        icon: '⚔️',
      });
      onDismiss?.();
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black overflow-hidden"
    >
      {/* Red vignette edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 200px 80px rgba(220,20,60,0.25)',
        }}
      />

      {/* Blood drip gradient from top */}
      <div
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(180,0,0,0.55) 0%, rgba(220,20,60,0.18) 60%, transparent 100%)',
        }}
      />
      {/* Subtle drip streaks */}
      {[8, 20, 35, 50, 65, 80, 92].map((left, i) => (
        <motion.div
          key={i}
          className="absolute top-0 w-[2px] rounded-b-full pointer-events-none"
          style={{
            left: `${left}%`,
            background:
              'linear-gradient(to bottom, rgba(180,0,0,0.7), transparent)',
            height: `${40 + i * 12}px`,
          }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ delay: 0.3 + i * 0.15, duration: 0.8, ease: 'easeOut' }}
        />
      ))}

      {/* CAISTE text */}
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, ease: 'easeIn' }}
        className="text-8xl font-black tracking-widest select-none"
        style={{
          color: '#DC143C',
          textShadow:
            '0 0 60px rgba(220,20,60,0.9), 0 0 120px rgba(220,20,60,0.4)',
          fontFamily: 'serif',
          letterSpacing: '0.15em',
        }}
      >
        CAÍSTE
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1.5 }}
        className="mt-4 text-base text-gray-500 tracking-[0.3em] uppercase select-none"
      >
        El Demonio de la Pereza te venció
      </motion.p>

      {/* Penitence mission card */}
      <AnimatePresence>
        {showMission && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            className="mt-16 w-full max-w-md mx-auto px-6"
          >
            <div
              className="rounded-2xl border border-red-800/50 p-8 text-center"
              style={{
                background:
                  'linear-gradient(135deg, rgba(30,0,0,0.95) 0%, rgba(10,0,0,0.98) 100%)',
                boxShadow:
                  '0 0 40px rgba(220,20,60,0.2), inset 0 1px 0 rgba(220,20,60,0.1)',
              }}
            >
              <div className="text-3xl mb-3">⚔️</div>
              <h2
                className="text-lg font-black uppercase tracking-widest mb-2"
                style={{ color: '#DC143C' }}
              >
                Misión de Penitencia
              </h2>
              <p className="text-gray-300 text-sm leading-relaxed mb-6">
                &ldquo;Completa 3 hábitos HOY para recuperar tu alma&rdquo;
              </p>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => acceptPenitence()}
                disabled={isPending}
                className="w-full py-3 px-6 rounded-xl font-bold text-sm uppercase tracking-widest transition-all disabled:opacity-50"
                style={{
                  background:
                    'linear-gradient(135deg, #8B0000 0%, #DC143C 100%)',
                  color: '#fff',
                  boxShadow: '0 0 20px rgba(220,20,60,0.4)',
                }}
              >
                {isPending ? 'Cargando...' : 'Acepto el reto'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
