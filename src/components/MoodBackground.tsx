'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/stores/useAppStore';

const environmentGradients: Record<string, string> = {
  rain: 'radial-gradient(ellipse at 50% 20%, rgba(30,58,95,0.4) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(17,24,39,0.6) 0%, transparent 50%)',
  city: 'radial-gradient(ellipse at 30% 40%, rgba(45,27,78,0.35) 0%, transparent 55%), radial-gradient(ellipse at 70% 60%, rgba(30,58,95,0.25) 0%, transparent 50%)',
  mountain: 'radial-gradient(ellipse at 50% 30%, rgba(30,41,59,0.4) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(17,24,39,0.5) 0%, transparent 50%)',
  night: 'radial-gradient(ellipse at 50% 10%, rgba(30,27,46,0.4) 0%, transparent 55%), radial-gradient(ellipse at 20% 70%, rgba(17,24,39,0.3) 0%, transparent 50%)',
  sunset: 'radial-gradient(ellipse at 50% 60%, rgba(76,29,61,0.35) 0%, transparent 55%), radial-gradient(ellipse at 30% 20%, rgba(45,27,78,0.25) 0%, transparent 50%)',
};

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) % 1;
  return x < 0 ? x + 1 : x;
}

export function MoodBackground() {
  const environment = useAppStore((s) => s.environment);

  const overlayStyle = useMemo(() => ({
    background: environmentGradients[environment] ?? environmentGradients.night,
  }), [environment]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#0B1020]" />

      <motion.div
        className="absolute inset-0 animate-drift"
        style={{
          background: 'linear-gradient(135deg, rgba(11,16,32,0.95) 0%, rgba(17,24,39,0.9) 25%, rgba(30,27,46,0.85) 50%, rgba(11,16,32,0.95) 75%, rgba(17,24,39,0.9) 100%)',
          backgroundSize: '400% 400%',
        }}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute inset-0"
        style={overlayStyle}
        key={environment}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 2.5, ease: 'easeInOut' }}
      />

      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vmin] h-[80vmin] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(125,211,252,0.06) 0%, transparent 70%)',
        }}
      />

      <Particles environment={environment} />
    </div>
  );
}

function Particles({ environment }: { environment: string }) {
  const particleCount = environment === 'rain' ? 40 : environment === 'run' ? 60 : 25;
  const speed = environment === 'run' ? 2.5 : environment === 'rain' ? 1.8 : 1;

  const particles = useMemo(() => {
    return Array.from({ length: particleCount }).map((_, i) => {
      const seed = environment.charCodeAt(0) + i * 7919;
      return {
        left: seededRandom(seed) * 100,
        delay: seededRandom(seed + 1) * 8,
        duration: (4 + seededRandom(seed + 2) * 6) / speed,
        size: environment === 'rain' ? 1.5 : 2 + seededRandom(seed + 3) * 2,
        opacity: 0.1 + seededRandom(seed + 4) * 0.3,
      };
    });
  }, [environment, particleCount, speed]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((p, i) => (
        <motion.div
          key={`${environment}-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: environment === 'rain'
              ? 'rgba(125,211,252,0.4)'
              : 'rgba(203,213,225,0.3)',
          }}
          initial={{ top: '-5%', opacity: 0 }}
          animate={{
            top: '105%',
            opacity: [0, p.opacity, p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}
