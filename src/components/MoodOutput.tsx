'use client';

import { useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2, Play, Pause } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useAudioStore } from '@/stores/useAudioStore';
import { useNeteasePlaylist } from '@/hooks/useNeteasePlaylist';
import { useAtmosphere } from '@/hooks/useAtmosphere';
import { generateMockMood } from '@/lib/moods';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export function MoodOutput() {
  const { energy, environment, activity, emotion } = useAppStore();
  const { t, i18n } = useTranslation('common');
  const locale = i18n.language;
  const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: atmosphere,
    loading: atmosphereLoading,
    error: atmosphereError,
    refetch: refetchAtmosphere,
  } = useAtmosphere(energy, environment, activity, emotion, locale);

  const mockMood = useMemo(
    () => generateMockMood(energy, environment, activity, emotion, locale),
    [energy, environment, activity, emotion, locale]
  );

  const {
    track: neteaseTrack,
    loading: neteaseLoading,
    refetch: refetchNetease,
  } = useNeteasePlaylist(environment);

  const { currentTrack, isPlaying, progress, playNetease, playGenerative, pause } =
    useAudioStore();

  const title = atmosphere?.title ?? mockMood.title;
  const description = atmosphere?.description ?? mockMood.description;
  const tags = atmosphere?.tags ?? mockMood.tags;
  const bpm = atmosphere?.bpm ?? mockMood.bpm;
  const hasAiData = !!atmosphere;

  // Auto-play when environment changes (with debounce)
  const triggerAutoPlay = useCallback(() => {
    if (autoPlayTimer.current) {
      clearTimeout(autoPlayTimer.current);
    }
    autoPlayTimer.current = setTimeout(() => {
      refetchNetease();
    }, 600);
  }, [refetchNetease]);

  useEffect(() => {
    triggerAutoPlay();
    return () => {
      if (autoPlayTimer.current) {
        clearTimeout(autoPlayTimer.current);
      }
    };
  }, [environment, triggerAutoPlay]);

  // Play netease track when it loads
  useEffect(() => {
    if (neteaseTrack && !neteaseLoading) {
      playNetease(neteaseTrack);
    }
  }, [neteaseTrack, neteaseLoading, playNetease]);

  // Stop audio when component unmounts or mood params change
  useEffect(() => {
    return () => {
      useAudioStore.getState().pause();
    };
  }, [energy, environment, activity, emotion]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      // Retry netease first, fallback to generative
      if (neteaseTrack) {
        playNetease(neteaseTrack);
      } else {
        const track = mockMood.tracks[0];
        if (track) playGenerative(track);
      }
    }
  };

  const coverUrl =
    currentTrack?.source === 'netease'
      ? currentTrack.cover
      : mockMood.tracks[0]?.cover;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${energy}-${environment}-${activity}-${emotion}-${locale}-${atmosphere?.title}`}
        initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="w-full max-w-xl mx-auto px-6 pb-24 md:pb-8"
      >
        {/* AI Generate Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={refetchAtmosphere}
            disabled={atmosphereLoading}
            className="group flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-background/60 backdrop-blur-sm text-xs tracking-wider uppercase text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {atmosphereLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
                <span>{hasAiData ? 'Regenerate' : 'AI Generate'}</span>
              </>
            )}
          </button>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground mb-3 min-h-[2.5rem]">
            {title}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-md mx-auto min-h-[1.5rem]">
            {description}
          </p>
          {atmosphereError && (
            <p className="text-[10px] text-muted-foreground/40 mt-1">
              AI offline · using local preset
            </p>
          )}
        </div>

        {/* Tags */}
        <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
          <Badge variant="secondary" className="px-3 py-1 text-xs tracking-wide">
            {bpm} {t('output.bpm')}
          </Badge>
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="px-3 py-1 text-xs tracking-wide border-border/50 text-muted-foreground cursor-default"
              title={tag}
            >
              {tag}
            </Badge>
          ))}
        </div>

        {/* Now Playing */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-48 h-48 rounded-2xl overflow-hidden bg-muted/30 shadow-2xl shadow-primary/10">
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt={currentTrack?.name ?? 'cover'}
                fill
                className="object-cover"
                sizes="192px"
              />
            ) : (
              <div className="w-full h-full bg-muted/50" />
            )}
            {/* Progress overlay */}
            {isPlaying && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/40">
                <motion.div
                  className="h-full bg-primary"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
            {/* Play/Pause overlay button */}
            <button
              onClick={handleTogglePlay}
              disabled={neteaseLoading}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors disabled:opacity-50"
            >
              <div className="w-14 h-14 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-lg">
                {neteaseLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-foreground" />
                ) : isPlaying ? (
                  <Pause className="w-6 h-6 text-foreground" />
                ) : (
                  <Play className="w-6 h-6 text-foreground ml-1" />
                )}
              </div>
            </button>
          </div>

          {/* Track info */}
          <div className="text-center">
            <p className="text-base font-medium text-foreground">
              {currentTrack?.name ?? t('output.ready')}
            </p>
            <p className="text-sm text-muted-foreground">
              {currentTrack?.artist ?? ''}
            </p>
            {currentTrack?.source === 'netease' && (
              <p className="text-[10px] text-muted-foreground/40 mt-1">NetEase Cloud Music</p>
            )}
            {currentTrack?.source === 'generative' && (
              <p className="text-[10px] text-muted-foreground/40 mt-1">Generative Audio</p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
