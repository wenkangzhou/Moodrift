'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/useAppStore';
import { generateMood } from '@/lib/moods';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export function MoodOutput() {
  const { energy, environment, activity, emotion } = useAppStore();
  const { t, i18n } = useTranslation('common');
  const locale = i18n.language;

  const mood = generateMood(energy, environment, activity, emotion, locale);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${energy}-${environment}-${activity}-${emotion}-${locale}`}
        initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="w-full max-w-xl mx-auto px-6 pb-24 md:pb-8"
      >
        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground mb-3">
            {mood.title}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
            {mood.description}
          </p>
        </div>

        {/* Tags */}
        <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
          <Badge variant="secondary" className="px-3 py-1 text-xs tracking-wide">
            {mood.bpm} {t('output.bpm')}
          </Badge>
          {mood.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="px-3 py-1 text-xs tracking-wide border-border/50 text-muted-foreground"
            >
              {tag}
            </Badge>
          ))}
        </div>

        {/* Tracks */}
        <div>
          <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4 text-center">
            {t('output.recommended')}
          </p>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory justify-start md:justify-center">
            {mood.tracks.map((track, i) => (
              <motion.div
                key={`${track.title}-${i}`}
                className="flex-shrink-0 w-36 snap-center cursor-pointer group"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -4 }}
              >
                <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-muted/30">
                  <Image
                    src={track.cover}
                    alt={track.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="144px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <p className="text-sm font-medium text-foreground truncate">
                  {track.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {track.artist}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">
                  {track.genre}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
