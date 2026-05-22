'use client';

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

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 py-4 gap-3 md:gap-4">
        {/* Header — logo + name */}
        <div
          className="shrink-0 animate-fade-up"
          style={{ animationDelay: '0.3s' }}
        >
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
        </div>

        {/* Tagline */}
        <div
          className="shrink-0 animate-fade-up"
          style={{ animationDelay: '0.45s' }}
        >
          <p className="text-[10px] tracking-wider text-muted-foreground/60 text-center">
            {t('appTagline')}
          </p>
        </div>

        {/* Orb */}
        <div
          className="shrink-0 scale-90 md:scale-100 animate-fade-up"
          style={{ animationDelay: '0.6s' }}
        >
          <MoodOrb />
        </div>

        {/* Output — title, tags, controls */}
        <div
          className="w-full max-w-md shrink-0 animate-fade-up"
          style={{ animationDelay: '0.75s' }}
        >
          <MoodOutput />
        </div>
      </div>
    </main>
  );
}
