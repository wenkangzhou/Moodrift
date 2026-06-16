'use client';

import { useRef, useEffect } from 'react';
import { useAudioStore } from '@/stores/useAudioStore';
import { useAtmosphereColorStore } from '@/stores/useAtmosphereColorStore';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function BackgroundFlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const isLoading = useAudioStore((s) => s.isLoading);
  const currentTrack = useAudioStore((s) => s.currentTrack);
  const palette = useAtmosphereColorStore((s) => s.palette);
  const reducedMotion = useReducedMotion();
  const isGenerative = currentTrack?.source === 'generative';

  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const getPalette = () => {
      return palette.length >= 3 ? palette : ['#7DD3FC20', '#A78BFA20', '#818CF815'];
    };

    const particleCount = 65;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      alpha: number;
    }

    const particles: Particle[] = [];
    const initialPalette = getPalette();
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 3 + 1.5,
        color: initialPalette[Math.floor(Math.random() * initialPalette.length)],
        alpha: Math.random() * 0.6 + 0.3,
      });
    }

    let time = 0;
    const draw = () => {
      time += 0.01;
      ctx.clearRect(0, 0, w, h);

      const speedMult = isLoading ? 1.8 : isGenerative && isPlaying ? 0.85 : isPlaying ? 1.65 : 0.85;
      const currentPalette = getPalette();

      // Draw flowing lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * speedMult;
        p.y += p.vy * speedMult;

        // Wrap around
        if (p.x < -50) p.x = w + 50;
        if (p.x > w + 50) p.x = -50;
        if (p.y < -50) p.y = h + 50;
        if (p.y > h + 50) p.y = -50;

        // Gradually shift particle color toward current palette
        if (Math.random() < 0.015) {
          p.color = currentPalette[Math.floor(Math.random() * currentPalette.length)];
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (isPlaying ? (isGenerative ? 1.12 : 1.35) : 1), 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(/[0-9a-fA-F]{2}$/, () =>
          Math.floor(p.alpha * (isPlaying ? (isGenerative ? 135 : 165) : 110)).toString(16).padStart(2, '0')
        );
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = p.color.replace(
              /[0-9a-fA-F]{2}$/,
              () =>
                Math.floor(
                  (0.1 * (1 - dist / 150) * (isPlaying ? (isGenerative ? 1.25 : 1.75) : 1)) * 255
                )
                  .toString(16)
                  .padStart(2, '0')
            );
            ctx.lineWidth = isPlaying ? (isGenerative ? 0.55 : 0.72) : 0.45;
            ctx.stroke();
          }
        }
      }

      // Wave overlay at bottom when playing
      if (isPlaying) {
        ctx.beginPath();
        const waveA = isGenerative ? 16 : 26;
        const waveB = isGenerative ? 10 : 18;
        for (let x = 0; x < w; x += 3) {
          const y =
            h - 100 + Math.sin(x * 0.008 + time * 3) * waveA + Math.sin(x * 0.004 + time * 2) * waveB;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, h - 160, 0, h);
        grad.addColorStop(0, currentPalette[0].replace('20', '12'));
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [isGenerative, isLoading, isPlaying, palette, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.9 }}
    />
  );
}
