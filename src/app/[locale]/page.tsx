'use client';

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { MoodBackground } from '@/components/MoodBackground';
import { BackgroundFlow } from '@/components/BackgroundFlow';
import { MoodOrb } from '@/components/MoodOrb';
import { MoodControls } from '@/components/MoodControls';
import { MoodOutput } from '@/components/MoodOutput';
import { AmbientPlayer } from '@/components/AmbientPlayer';

export default function HomePage() {
  const { t } = useTranslation('common');

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <MoodBackground />
      <BackgroundFlow />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center pt-12 md:pt-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="flex items-center justify-center gap-3 mb-2"
        >
          <Image
            src="/logo.png"
            alt="Moodrift"
            width={28}
            height={28}
            className="opacity-80"
            priority
          />
          <h1 className="text-sm font-medium tracking-[0.3em] uppercase text-muted-foreground">
            {t('appName')}
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.4 }}
          className="text-xs tracking-wider text-muted-foreground/60 mb-8"
        >
          {t('appTagline')}
        </motion.p>

        {/* Orb */}
        <MoodOrb />

        {/* Controls */}
        <div className="mt-6 w-full">
          <MoodControls />
        </div>

        {/* Ambient Player */}
        <AmbientPlayer />

        {/* Output */}
        <div className="mt-2 w-full">
          <MoodOutput />
        </div>
      </div>
    </main>
  );
}
