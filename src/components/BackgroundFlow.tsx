'use client';

import { useRef, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useAudioStore } from '@/stores/useAudioStore';

export function BackgroundFlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { energy, environment } = useAppStore();
  const { isPlaying } = useAudioStore();

  useEffect(() => {
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

    // Color palettes per environment
    const palettes: Record<string, string[]> = {
      rain: ['#7DD3FC20', '#A78BFA20', '#60A5FA15'],
      city: ['#F9A8D420', '#7DD3FC20', '#C084FC15'],
      mountain: ['#A78BFA20', '#94A3B820', '#CBD5E115'],
      night: ['#7DD3FC20', '#A78BFA20', '#818CF815'],
      sunset: ['#F9A8D420', '#A78BFA20', '#F472B615'],
    };

    const palette = palettes[environment] ?? palettes.night;
    const particleCount = Math.floor(40 + (energy / 100) * 50);

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
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 3 + 1.5,
        color: palette[Math.floor(Math.random() * palette.length)],
        alpha: Math.random() * 0.6 + 0.3,
      });
    }

    let time = 0;
    const draw = () => {
      time += 0.01;
      ctx.clearRect(0, 0, w, h);

      const speedMult = isPlaying ? 2.5 : 1;

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

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (isPlaying ? 1.5 : 1), 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(/[0-9a-fA-F]{2}$/, () =>
          Math.floor(p.alpha * (isPlaying ? 180 : 120)).toString(16).padStart(2, '0')
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
                  (0.12 * (1 - dist / 150) * (isPlaying ? 2 : 1)) * 255
                )
                  .toString(16)
                  .padStart(2, '0')
            );
            ctx.lineWidth = isPlaying ? 0.8 : 0.5;
            ctx.stroke();
          }
        }
      }

      // Wave overlay at bottom when playing
      if (isPlaying) {
        ctx.beginPath();
        for (let x = 0; x < w; x += 3) {
          const y =
            h - 100 + Math.sin(x * 0.008 + time * 3) * 30 + Math.sin(x * 0.004 + time * 2) * 20;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, h - 160, 0, h);
        grad.addColorStop(0, palette[0].replace('20', '12'));
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
  }, [energy, environment, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.9 }}
    />
  );
}
