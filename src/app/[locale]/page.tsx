'use client';

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { MoodBackground } from '@/components/MoodBackground';
import { BackgroundFlow } from '@/components/BackgroundFlow';
import { MoodOrb } from '@/components/MoodOrb';
import { MoodOutput } from '@/components/MoodOutput';

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.18,
      delayChildren: 0.3,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

export default function HomePage() {
  const { t } = useTranslation('common');

  return (
    <main className="relative h-screen overflow-hidden">
      <MoodBackground />
      <BackgroundFlow />

      <motion.div
        className="relative z-10 h-full flex flex-col items-center justify-center px-4 py-4 gap-3 md:gap-4"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        {/* Header — logo + name */}
        <motion.div
          variants={item}
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

        {/* Tagline */}
        <motion.p
          variants={item}
          className="text-[10px] tracking-wider text-muted-foreground/60 shrink-0"
        >
          {t('appTagline')}
        </motion.p>

        {/* Orb */}
        <motion.div
          variants={item}
          className="shrink-0 scale-90 md:scale-100"
        >
          <MoodOrb />
        </motion.div>

        {/* Output — title, tags, controls */}
        <motion.div
          variants={item}
          className="w-full max-w-md shrink-0"
        >
          <MoodOutput />
        </motion.div>
      </motion.div>
    </main>
  );
}
