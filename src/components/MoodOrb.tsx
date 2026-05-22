'use client';

import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioStore } from '@/stores/useAudioStore';
import { useAtmosphereColorStore } from '@/stores/useAtmosphereColorStore';
import * as THREE from 'three';

/* ─── Three.js Orb (desktop) ─── */

function OrbMesh({
  color,
  secondary,
  isPlaying,
  isLoading,
}: {
  color: string;
  secondary: string;
  isPlaying: boolean;
  isLoading: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    if (isLoading) {
      const pulse = 1 + Math.sin(t * 4) * 0.12;
      meshRef.current.scale.setScalar(pulse);
      meshRef.current.rotation.y += 0.015;
      meshRef.current.rotation.x = Math.sin(t * 3) * 0.08;
      if (lightRef.current) {
        lightRef.current.intensity = 3 + Math.sin(t * 6) * 1.5;
      }
      if (glowRef.current) {
        glowRef.current.scale.setScalar(1.15 + Math.sin(t * 4) * 0.15);
      }
      if (ringRef.current) {
        ringRef.current.rotation.z += 0.04;
        ringRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
      }
      return;
    }

    const basePulse = isPlaying ? 1.5 : 0.5;
    const beatPulse = isPlaying ? Math.PI * 2 : 0;

    const breathe = 1 + Math.sin(t * basePulse) * 0.04;
    const beat = isPlaying ? Math.sin(t * beatPulse) * 0.03 : 0;
    meshRef.current.scale.setScalar(breathe + beat);
    meshRef.current.position.y = Math.sin(t * 0.3) * 0.15;

    meshRef.current.rotation.y += isPlaying ? 0.003 : 0.001;
    meshRef.current.rotation.x = Math.sin(t * 0.2) * 0.05;

    if (lightRef.current) {
      lightRef.current.intensity = isPlaying
        ? 2.5 + Math.sin(t * beatPulse) * 1.2
        : 1.5 + Math.sin(t * basePulse * 1.5) * 0.5;
    }

    if (glowRef.current) {
      const glowScale = isPlaying ? 1 + Math.sin(t * beatPulse) * 0.08 : 1;
      glowRef.current.scale.setScalar(glowScale);
    }

    if (ringRef.current) {
      ringRef.current.rotation.z += isPlaying ? 0.005 : 0.002;
    }
  });

  return (
    <group>
      <pointLight ref={lightRef} position={[0, 0, 0]} color={color} intensity={2} distance={8} />
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.2, 64, 64]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isPlaying ? 0.4 : 0.15}
          roughness={0.35}
          metalness={0.1}
          clearcoat={isPlaying ? 1 : 0.3}
          clearcoatRoughness={0.1}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.45, 64, 64]} />
        <meshBasicMaterial
          color={secondary}
          transparent
          opacity={isPlaying ? 0.12 : 0.06}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isPlaying ? 0.25 : 0.15}
        />
      </mesh>
      {isPlaying && !isLoading && (
        <mesh rotation={[Math.PI / 2, 0, 0]} ref={ringRef}>
          <torusGeometry args={[1.6, 0.015, 16, 100]} />
          <meshBasicMaterial color={secondary} transparent opacity={0.3} />
        </mesh>
      )}
      {isLoading && (
        <mesh ref={ringRef}>
          <torusGeometry args={[1.7, 0.02, 16, 100]} />
          <meshBasicMaterial color={secondary} transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

function Scene({ isLoading }: { isLoading: boolean }) {
  const { isPlaying } = useAudioStore();
  const { primary, secondary } = useAtmosphereColorStore();

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} color="#CBD5E1" />
      <OrbMesh
        color={primary}
        secondary={secondary}
        isPlaying={isPlaying}
        isLoading={isLoading}
      />
    </>
  );
}

/* ─── Fallback Orb (mobile / touch) ─── */

interface Ripple {
  id: number;
  x: number;
  y: number;
}

function FallbackOrb({
  isPlaying,
  isLoading,
  dragOffset,
  pulseKey,
  ripples,
}: {
  isPlaying: boolean;
  isLoading: boolean;
  dragOffset: number;
  pulseKey: number;
  ripples: Ripple[];
}) {
  const { primary, secondary } = useAtmosphereColorStore();

  const glowOpacity = isLoading ? '44' : isPlaying ? '31' : '19';
  const bodyOpacity = isLoading ? 'ff' : isPlaying ? '80' : '60';
  const shadowSpread = isLoading ? '100px' : isPlaying ? '80px' : '50px';
  const shadowOpacity = isLoading ? '90' : isPlaying ? '60' : '40';

  // Stretch physics: drag stretches horizontally, compresses vertically
  const absOffset = Math.abs(dragOffset);
  const stretch = Math.min(absOffset * 0.003, 0.3);
  const scaleX = 1 + stretch;
  const scaleY = 1 - stretch * 0.4;
  const rotateZ = dragOffset * 0.015;

  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
      {/* Ambient float wrapper */}
      <div className="absolute inset-0 animate-float">
        {/* Pulse ring on song change */}
        <AnimatePresence>
          {pulseKey > 0 && (
            <motion.div
              key={pulseKey}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                border: `2px solid ${primary}`,
                boxShadow: `0 0 20px ${primary}60`,
              }}
              initial={{ scale: 0.4, opacity: 0.6 }}
              animate={{ scale: 2.8, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        {/* Glow layer */}
        <motion.div
          className="absolute inset-0 rounded-full blur-3xl"
          animate={{
            background: `radial-gradient(circle, ${primary}${glowOpacity} 0%, transparent 70%)`,
          }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{
            animation: isLoading
              ? 'pulse-glow 0.6s ease-in-out infinite alternate'
              : isPlaying
                ? 'pulse-glow 1.5s ease-in-out infinite alternate'
                : 'pulse-glow 3s ease-in-out infinite alternate',
          }}
        />

        {/* Drag trail — appears behind orb when swiping */}
        <AnimatePresence>
          {absOffset > 8 && (
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
                opacity: Math.min(absOffset / 60, 0.45),
                scaleX,
                scaleY,
              }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            />
          )}
        </AnimatePresence>

        {/* Orb body */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-60 md:h-60 rounded-full overflow-hidden"
          animate={{
            background: `radial-gradient(circle at 35% 35%, ${primary} 0%, ${secondary}${bodyOpacity} 50%, ${primary}20 100%)`,
            boxShadow: `0 0 ${shadowSpread} ${primary}${shadowOpacity}`,
            scaleX,
            scaleY,
            rotateZ,
          }}
          transition={{
            background: { duration: 0.7, ease: 'easeOut' },
            boxShadow: { duration: 0.7, ease: 'easeOut' },
            scaleX: absOffset === 0 ? { type: 'spring', stiffness: 500, damping: 22 } : { duration: 0.05 },
            scaleY: absOffset === 0 ? { type: 'spring', stiffness: 500, damping: 22 } : { duration: 0.05 },
            rotateZ: absOffset === 0 ? { type: 'spring', stiffness: 400, damping: 20 } : { duration: 0.05 },
          }}
        >
          {/* Inner glow overlay */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              background: `radial-gradient(circle at 50% 50%, transparent 55%, ${secondary}18 100%)`,
            }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
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
              initial={{ scale: 0, x: r.x, y: r.y, opacity: 0.8 }}
              animate={{ scale: 10, x: r.x, y: r.y, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-7 h-7 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─── */

export function MoodOrb() {
  const [mounted, setMounted] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const { isPlaying, isLoading, pause, currentTrack } = useAudioStore();

  // Swipe detection
  const swipeRef = useRef<{ startX: number; startY: number; tracking: boolean }>({
    startX: 0,
    startY: 0,
    tracking: false,
  });

  const [dragOffset, setDragOffset] = useState(0);
  const dragRafRef = useRef(0);

  // Pulse animation trigger on song change
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    if (currentTrack) {
      setPulseKey((k) => k + 1);
    }
  }, [currentTrack?.neteaseId, currentTrack?.name]);

  // Click ripples
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

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      const isSmallScreen = window.innerWidth < 768;
      const isTouch = navigator.maxTouchPoints > 0;
      if (isSmallScreen || isTouch) {
        setUseFallback(true);
        return;
      }
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) setUseFallback(true);
      } catch {
        setUseFallback(true);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    addRipple(e);
    if (isPlaying) {
      pause();
    } else {
      window.dispatchEvent(new CustomEvent('moodrift:request-play'));
    }
  };

  const SWIPE_THRESHOLD = 50;
  const VERTICAL_TOLERANCE = 30;

  const handlePointerDown = (e: React.PointerEvent) => {
    swipeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      tracking: true,
    };
    setDragOffset(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!swipeRef.current.tracking) return;
    const dx = e.clientX - swipeRef.current.startX;
    const dy = e.clientY - swipeRef.current.startY;

    if (Math.abs(dx) > Math.abs(dy)) {
      const damped = dx * 0.4;
      if (dragRafRef.current) cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = requestAnimationFrame(() => setDragOffset(damped));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!swipeRef.current.tracking) return;
    swipeRef.current.tracking = false;
    if (dragRafRef.current) cancelAnimationFrame(dragRafRef.current);
    setDragOffset(0);

    const dx = e.clientX - swipeRef.current.startX;
    const dy = e.clientY - swipeRef.current.startY;

    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dy) < VERTICAL_TOLERANCE) {
      window.dispatchEvent(new CustomEvent('moodrift:request-drift'));
    }
  };

  if (!mounted) {
    return (
      <div className="w-full h-[32vh] md:h-[38vh] flex items-center justify-center">
        <div className="w-48 h-48 md:w-60 md:h-60 rounded-full bg-primary/30 animate-pulse" />
      </div>
    );
  }

  const orbHandlers = {
    onClick: handleClick,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerLeave: handlePointerUp,
  };

  if (useFallback) {
    return (
      <motion.div
        className="w-full h-[32vh] md:h-[38vh] flex items-center justify-center cursor-pointer touch-pan-y select-none"
        {...orbHandlers}
        animate={{ x: dragOffset }}
        transition={
          dragOffset === 0
            ? { type: 'spring', stiffness: 400, damping: 28, mass: 0.8 }
            : { duration: 0 }
        }
      >
        <FallbackOrb
          isPlaying={isPlaying}
          isLoading={isLoading}
          dragOffset={dragOffset}
          pulseKey={pulseKey}
          ripples={ripples}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-full h-[32vh] md:h-[38vh] relative cursor-pointer touch-pan-y select-none"
      {...orbHandlers}
      animate={{ x: dragOffset }}
      transition={
        dragOffset === 0
          ? { type: 'spring', stiffness: 400, damping: 28, mass: 0.8 }
          : { duration: 0 }
      }
    >
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onError={() => setUseFallback(true)}
      >
        <Suspense fallback={null}>
          <Scene isLoading={isLoading} />
        </Suspense>
      </Canvas>
    </motion.div>
  );
}
