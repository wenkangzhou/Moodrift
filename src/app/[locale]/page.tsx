'use client';

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { MoodBackground } from '@/components/MoodBackground';
import { BackgroundFlow } from '@/components/BackgroundFlow';
import { MoodOrb } from '@/components/MoodOrb';
import { MoodOutput } from '@/components/MoodOutput';

const easeOutExpo: [number, number, number, number] = [0.22, 1, 0.36, 1];

function FadeUp({
  children,
  delay,
  className,
}: {
  children: React.ReactNode;
  delay: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay, ease: easeOutExpo }}
    >
      {children}
    </motion.div>
  );
}

export default function HomePage() {
  const { t } = useTranslation('common');

  return (
    <main className="relative h-screen overflow-hidden">
      <MoodBackground />
      <BackgroundFlow />

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 py-4 gap-3 md:gap-4">
        {/* Header — logo + name */}
        <FadeUp delay={0.3} className="shrink-0">
          <div className="flex items-center justify-center gap-2">
            <Image
              src="/logo.png"
              alt="Moodrift"
              width={22}
              height={22}
              className="opacity-80"
              priority
            />
            <h1 className="text-xs font-medium tracking-[0.3em] uppercase text-muted-foreground">
              {t('appName')}
            </h1>
          </div>
        </FadeUp>

        {/* Tagline */}
        <FadeUp delay={0.45} className="shrink-0">
          <p className="text-[10px] tracking-wider text-muted-foreground/60 text-center">
            {t('appTagline')}
          </p>
        </FadeUp>

        {/* Orb */}
        <FadeUp delay={0.6} className="shrink-0 scale-90 md:scale-100">
          <MoodOrb />
        </FadeUp>

        {/* Output — title, tags, controls */}
        <FadeUp delay={0.75} className="w-full max-w-md shrink-0">
          <MoodOutput />
        </FadeUp>
      </div>
    </main>
  );
}
