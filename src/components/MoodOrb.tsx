'use client';

import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useAppStore } from '@/stores/useAppStore';
import { useAudioStore } from '@/stores/useAudioStore';
import { generateMockMood } from '@/lib/moods';
import * as THREE from 'three';

function OrbMesh({
  color,
  secondary,
  energy,
  isPlaying,
  bpm,
}: {
  color: string;
  secondary: string;
  energy: number;
  isPlaying: boolean;
  bpm: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const basePulse = 0.5 + (energy / 100) * 2;
  const beatPulse = isPlaying ? (bpm / 60) * Math.PI * 2 : 0;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    // Base breathing + beat-driven pulse when playing
    const breathe = 1 + Math.sin(t * basePulse) * 0.04;
    const beat = isPlaying ? Math.sin(t * beatPulse) * 0.03 : 0;
    meshRef.current.scale.setScalar(breathe + beat);
    meshRef.current.position.y = Math.sin(t * (0.3 + (energy / 100))) * 0.15;

    // Rotate slowly, faster when playing
    meshRef.current.rotation.y += isPlaying ? 0.003 : 0.001;
    meshRef.current.rotation.x = Math.sin(t * 0.2) * 0.05;

    if (lightRef.current) {
      lightRef.current.intensity = isPlaying
        ? 2.5 + Math.sin(t * beatPulse) * 1.2
        : 2 + Math.sin(t * basePulse * 1.5) * 0.8;
    }

    if (glowRef.current) {
      const glowScale = isPlaying ? 1 + Math.sin(t * beatPulse) * 0.08 : 1;
      glowRef.current.scale.setScalar(glowScale);
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
          emissiveIntensity={0.4}
          roughness={0.35}
          metalness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          transparent
          opacity={0.92}
        />
      </mesh>
      {/* Outer glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.45, 32, 32]} />
        <meshBasicMaterial
          color={secondary}
          transparent
          opacity={isPlaying ? 0.12 : 0.06}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Inner core */}
      <mesh>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isPlaying ? 0.25 : 0.15}
        />
      </mesh>
      {/* Ring when playing */}
      {isPlaying && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.6, 0.015, 16, 100]} />
          <meshBasicMaterial color={secondary} transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

function Scene() {
  const { energy, environment, activity, emotion } = useAppStore();
  const [locale, setLocale] = useState('zh');
  const { isPlaying } = useAudioStore();

  useEffect(() => {
    const unsub = useAppStore.subscribe((s) => {
      setLocale(s.locale);
    });
    return unsub;
  }, []);

  const mood = generateMockMood(energy, environment, activity, emotion, locale);

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} color="#CBD5E1" />
      <OrbMesh
        color={mood.orbColor}
        secondary={mood.orbSecondary}
        energy={energy}
        isPlaying={isPlaying}
        bpm={mood.bpm}
      />
    </>
  );
}

function FallbackOrb() {
  const { energy, environment, activity, emotion } = useAppStore();
  const [locale, setLocale] = useState('zh');
  const { isPlaying } = useAudioStore();

  useEffect(() => {
    const unsub = useAppStore.subscribe((s) => {
      setLocale(s.locale);
    });
    return unsub;
  }, []);

  const mood = generateMockMood(energy, environment, activity, emotion, locale);

  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center animate-float">
      <div
        className="absolute inset-0 rounded-full blur-3xl animate-pulse-glow"
        style={{
          background: `radial-gradient(circle, ${mood.orbColor}${isPlaying ? '50' : '30'} 0%, transparent 70%)`,
        }}
      />
      <div
        className="relative w-48 h-48 md:w-60 md:h-60 rounded-full transition-all duration-700"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${mood.orbColor} 0%, ${mood.orbSecondary}60 50%, ${mood.orbColor}20 100%)`,
          boxShadow: `0 0 ${isPlaying ? '80px' : '60px'} ${mood.orbColor}${isPlaying ? '60' : '40'}, inset 0 0 40px ${mood.orbSecondary}20`,
        }}
      />
    </div>
  );
}

export function MoodOrb() {
  const [mounted, setMounted] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setWebglFailed(true);
    } catch {
      setWebglFailed(true);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[45vh] md:h-[50vh] flex items-center justify-center">
        <div className="w-48 h-48 md:w-60 md:h-60 rounded-full bg-muted/20 animate-pulse" />
      </div>
    );
  }

  if (webglFailed) {
    return <FallbackOrb />;
  }

  return (
    <div className="w-full h-[45vh] md:h-[50vh] relative">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        onError={() => setWebglFailed(true)}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
