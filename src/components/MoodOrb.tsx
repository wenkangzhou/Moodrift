'use client';

import { useEffect, useRef, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioStore } from '@/stores/useAudioStore';
import { useAtmosphereColorStore } from '@/stores/useAtmosphereColorStore';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

const OrbBody = memo(function OrbBody({
  isPlaying,
  isLoading,
  dragOffset,
  dragOffsetY,
  pulseKey,
  pulseActive,
  reducedMotion,
  ripples,
}: {
  isPlaying: boolean;
  isLoading: boolean;
  dragOffset: number;
  dragOffsetY: number;
  pulseKey: string;
  pulseActive: boolean;
  reducedMotion: boolean;
  ripples: Ripple[];
}) {
  const { primary, secondary } = useAtmosphereColorStore();

  const glowOpacity = isLoading ? '44' : isPlaying ? '31' : '19';
  const bodyOpacity = isLoading ? 'ff' : isPlaying ? '80' : '60';
  const shadowSpread = isLoading ? '100px' : isPlaying ? '80px' : '50px';
  const shadowOpacity = isLoading ? '90' : isPlaying ? '60' : '40';

  const absOffsetX = Math.abs(dragOffset);
  const absOffsetY = Math.abs(dragOffsetY);
  const hStretch = Math.min(absOffsetX * 0.003, 0.3);
  const vStretch = Math.min(absOffsetY * 0.003, 0.3);
  const scaleX = 1 + hStretch - vStretch * 0.4;
  const scaleY = 1 - hStretch * 0.4 + vStretch;
  const rotateZ = dragOffset * 0.015;

  return (
    <div className={`relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center ${reducedMotion ? '' : 'animate-float'}`}>
      {/* Pulse ring on song change */}
      {pulseActive && (
        <motion.div
          key={pulseKey}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: `2px solid ${primary}`,
            boxShadow: `0 0 20px ${primary}60`,
          }}
          initial={{ scale: reducedMotion ? 2.8 : 0.4, opacity: reducedMotion ? 0 : 0.6 }}
          animate={{ scale: 2.8, opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.8, ease: 'easeOut' }}
        />
      )}

      {/* Glow layer */}
      <motion.div
        className="absolute inset-0 rounded-full blur-3xl"
        animate={{
          background: `radial-gradient(circle, ${primary}${glowOpacity} 0%, transparent 70%)`,
        }}
        transition={{ duration: reducedMotion ? 0 : 0.7, ease: 'easeOut' }}
        style={{
          animation: reducedMotion
            ? 'none'
            : isLoading
              ? 'pulse-glow 0.6s ease-in-out infinite alternate'
              : isPlaying
                ? 'pulse-glow 1.5s ease-in-out infinite alternate'
                : 'pulse-glow 3s ease-in-out infinite alternate',
        }}
      />

      {/* Drag trail */}
      <AnimatePresence>
        {(absOffsetX > 8 || absOffsetY > 8) && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl pointer-events-none"
            style={{
              width: '35%',
              height: '35%',
              background: `radial-gradient(circle, ${secondary}80 0%, transparent 70%)`,
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              x: -dragOffset * 0.2,
              y: -dragOffsetY * 0.2,
              opacity: Math.min(Math.max(absOffsetX, absOffsetY) / 60, 0.45),
              scaleX,
              scaleY,
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: reducedMotion ? 0 : 0.15 }}
          />
        )}
      </AnimatePresence>

      {/* Orb body */}
      <motion.div
        className="relative w-48 h-48 md:w-60 md:h-60 rounded-full"
        animate={{
          background: `radial-gradient(circle at 35% 35%, ${primary} 0%, ${secondary}${bodyOpacity} 50%, ${primary}20 100%)`,
          boxShadow: `0 0 ${shadowSpread} ${primary}${shadowOpacity}`,
          scaleX,
          scaleY,
          rotateZ,
        }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : {
                background: { duration: 0.7, ease: 'easeOut' },
                boxShadow: { duration: 0.7, ease: 'easeOut' },
                scaleX: (absOffsetX === 0 && absOffsetY === 0) ? { type: 'spring', stiffness: 500, damping: 22 } : { duration: 0.05 },
                scaleY: (absOffsetX === 0 && absOffsetY === 0) ? { type: 'spring', stiffness: 500, damping: 22 } : { duration: 0.05 },
                rotateZ: (absOffsetX === 0 && absOffsetY === 0) ? { type: 'spring', stiffness: 400, damping: 20 } : { duration: 0.05 },
              }
        }
      >
        {/* Inner glow overlay */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            background: `radial-gradient(circle at 50% 50%, transparent 55%, ${secondary}18 100%)`,
          }}
          transition={{ duration: reducedMotion ? 0 : 0.7, ease: 'easeOut' }}
        />
      </motion.div>

      {/* Click ripples */}
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.div
            key={r.id}
            className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
            style={{
              width: 32,
              height: 32,
              marginLeft: -16,
              marginTop: -16,
              background: `radial-gradient(circle, ${primary}60 0%, transparent 70%)`,
            }}
            initial={{ scale: reducedMotion ? 10 : 0, x: r.x, y: r.y, opacity: reducedMotion ? 0 : 0.8 }}
            animate={{ scale: 10, x: r.x, y: r.y, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.7, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-7 h-7 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
});

export function MoodOrb() {
  const { isPlaying, isLoading, pause, currentTrack } = useAudioStore();
  const reducedMotion = useReducedMotion();

  const swipeRef = useRef<{ startX: number; startY: number; tracking: boolean }>({
    startX: 0,
    startY: 0,
    tracking: false,
  });
  const didSwipeRef = useRef(false);

  const [dragOffset, setDragOffset] = useState(0);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const dragRafRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pulseKey = currentTrack
    ? `${currentTrack.source}-${currentTrack.neteaseId ?? currentTrack.name}`
    : 'idle';

  const [ripples, setRipples] = useState<Ripple[]>([]);
  const addRipple = (e: React.MouseEvent | React.PointerEvent) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const id = Date.now() + Math.random();
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 800);
  };

  const clearClickTimer = () => {
    if (!clickTimerRef.current) return;
    clearTimeout(clickTimerRef.current);
    clickTimerRef.current = null;
  };

  const requestPlayback = () => {
    if (isPlaying) {
      pause();
    } else {
      window.dispatchEvent(new CustomEvent('moodrift:request-play'));
    }
  };

  const requestDrift = () => {
    window.dispatchEvent(new CustomEvent('moodrift:request-drift'));
  };

  const handleClick = (e: React.MouseEvent) => {
    if (didSwipeRef.current) return;
    addRipple(e);

    if (e.detail > 1) {
      clearClickTimer();
      requestDrift();
      return;
    }

    clearClickTimer();
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      requestPlayback();
    }, 220);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      requestPlayback();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      requestDrift();
    }
  };

  useEffect(() => clearClickTimer, []);

  const SWIPE_THRESHOLD = 50;
  const VERTICAL_TOLERANCE = 30;

  const handlePointerDown = (e: React.PointerEvent) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Some browser automation layers do not expose pointer capture.
    }
    swipeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      tracking: true,
    };
    setDragOffset(0);
    setDragOffsetY(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!swipeRef.current.tracking) return;
    const dx = e.clientX - swipeRef.current.startX;
    const dy = e.clientY - swipeRef.current.startY;

    if (Math.abs(dx) > Math.abs(dy)) {
      const damped = dx * 0.4;
      if (dragRafRef.current) cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = requestAnimationFrame(() => {
        setDragOffset(damped);
        setDragOffsetY(0);
      });
    } else {
      const damped = dy * 0.4;
      if (dragRafRef.current) cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = requestAnimationFrame(() => {
        setDragOffset(0);
        setDragOffsetY(damped);
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!swipeRef.current.tracking) return;
    swipeRef.current.tracking = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Safe to ignore when capture was not established.
    }
    if (dragRafRef.current) cancelAnimationFrame(dragRafRef.current);
    setDragOffset(0);
    setDragOffsetY(0);

    const dx = e.clientX - swipeRef.current.startX;
    const dy = e.clientY - swipeRef.current.startY;

    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dy) < VERTICAL_TOLERANCE) {
      clearClickTimer();
      didSwipeRef.current = true;
      requestDrift();
      window.setTimeout(() => {
        didSwipeRef.current = false;
      }, 220);
    }
  };

  const orbHandlers = {
    onClick: handleClick,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerLeave: handlePointerUp,
    onPointerCancel: handlePointerUp,
    onKeyDown: handleKeyDown,
  };

  const isAtRest = dragOffset === 0 && dragOffsetY === 0;

  return (
    <motion.div
      className="w-full h-[32vh] md:h-[38vh] flex items-center justify-center cursor-pointer touch-none select-none"
      animate={{ x: dragOffset, y: dragOffsetY }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : isAtRest
            ? { type: 'spring', stiffness: 400, damping: 28, mass: 0.8 }
            : { duration: 0 }
      }
    >
      <button
        type="button"
        {...orbHandlers}
        aria-label={isPlaying ? 'Pause Moodrift' : 'Enter Moodrift'}
        aria-pressed={isPlaying}
        className="appearance-none border-0 bg-transparent p-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-8 focus-visible:ring-offset-transparent"
      >
        <OrbBody
          isPlaying={isPlaying}
          isLoading={isLoading}
          dragOffset={dragOffset}
          dragOffsetY={dragOffsetY}
          pulseKey={pulseKey}
          pulseActive={Boolean(currentTrack)}
          reducedMotion={reducedMotion}
          ripples={ripples}
        />
      </button>
    </motion.div>
  );
}
