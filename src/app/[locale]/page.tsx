'use client';

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { MoodBackground } from '@/components/MoodBackground';
import { BackgroundFlow } from '@/components/BackgroundFlow';
import { MoodOrb } from '@/components/MoodOrb';
import { MoodOutput } from '@/components/MoodOutput';

export default function HomePage() {
  const { t } = useTranslation('common');

  return (
    <main className="relative h-screen overflow-hidden">
      <MoodBackground />
      <BackgroundFlow />

      {/* Content — single screen, centered, compact */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 py-4 gap-3 md:gap-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="flex items-center justify-center gap-2 shrink-0"
        >
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
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.4 }}
          className="text-[10px] tracking-wider text-muted-foreground/60 shrink-0"
        >
          {t('appTagline')}
        </motion.p>

        {/* Orb — click to play/pause */}
        <div className="shrink-0 scale-90 md:scale-100">
          <MoodOrb />
        </div>

        {/* Output — title, tags, playback status */}
        <div className="w-full max-w-md shrink-0">
          <MoodOutput />
        </div>
      </div>
    </main>
  );
}
