'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { AmbientSynth } from '@/lib/ambient-synth';
import { useAppStore } from '@/stores/useAppStore';

export function AmbientPlayer() {
  const { energy, environment, emotion } = useAppStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef<AmbientSynth | null>(null);

  const toggle = useCallback(() => {
    if (!synthRef.current) {
      synthRef.current = new AmbientSynth();
    }
    synthRef.current.toggle(energy, environment, emotion);
    setIsPlaying(synthRef.current.isPlaying);
  }, [energy, environment, emotion]);

  // Auto-stop when mood changes while playing
  useEffect(() => {
    if (isPlaying && synthRef.current) {
      synthRef.current.stop();
      setIsPlaying(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [energy, environment, emotion]);

  // Resume AudioContext when switching back to this tab
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) {
        synthRef.current?.resumeIfSuspended();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.stop();
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.8 }}
      className="flex flex-col items-center gap-3 mt-8 mb-4"
    >
      <button
        onClick={toggle}
        className="group relative flex items-center justify-center w-14 h-14 rounded-full border border-border/50 bg-background/60 backdrop-blur-sm text-foreground hover:bg-background hover:border-primary/40 transition-all duration-500"
      >
        <AnimatePresence mode="wait">
          {isPlaying ? (
            <motion.div
              key="pause"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Pause className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div
              key="play"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Play className="w-5 h-5 ml-0.5" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Breathing ring */}
        {isPlaying && (
          <motion.div
            className="absolute inset-0 rounded-full border border-primary/30"
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </button>

      <p className="text-[10px] tracking-widest uppercase text-muted-foreground/60">
        {isPlaying ? 'Generating ambiance...' : 'Play ambient sound'}
      </p>
    </motion.div>
  );
}
