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
import type { NeteaseTrack } from '@/lib/netease';

export function MoodOutput() {
  const { energy, environment, activity, emotion } = useAppStore();
  const { t, i18n } = useTranslation('common');
  const locale = i18n.language;
  const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryPlayRef = useRef<(t?: NeteaseTrack) => void>(() => {});

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
    nextTrack,
  } = useNeteasePlaylist(environment, atmosphere?.playlistIds);

  const { currentTrack, isPlaying, progress, playNetease, playGenerative, pause } =
    useAudioStore();

  const title = atmosphere?.title ?? mockMood.title;
  const description = atmosphere?.description ?? mockMood.description;
  const tags = atmosphere?.tags ?? mockMood.tags;
  const bpm = atmosphere?.bpm ?? mockMood.bpm;

  // Retry helper: auto-advance to next candidate on timeout/error
  useEffect(() => {
    retryPlayRef.current = (t?: NeteaseTrack) => {
      const target = t ?? neteaseTrack;
      if (target) {
        playNetease(target, {
          fallback: mockMood.tracks[0],
          onFail: () => {
            const next = nextTrack();
            if (next) {
              retryPlayRef.current(next);
            } else {
              const track = mockMood.tracks[0];
              if (track) playGenerative(track);
            }
          },
        });
      } else {
        const track = mockMood.tracks[0];
        if (track) playGenerative(track);
      }
    };
  }, [neteaseTrack, playNetease, playGenerative, nextTrack, mockMood]);

  // Auto-play when environment changes (with debounce)
  const triggerAutoPlay = useCallback(() => {
    if (autoPlayTimer.current) {
      clearTimeout(autoPlayTimer.current);
    }
    autoPlayTimer.current = setTimeout(() => {
      refetchNetease();
    }, 500);
  }, [refetchNetease]);

  useEffect(() => {
    triggerAutoPlay();
    return () => {
      if (autoPlayTimer.current) {
        clearTimeout(autoPlayTimer.current);
      }
    };
  }, [environment, triggerAutoPlay]);

  // When AI returns new playlistIds, refetch from the curated pool
  useEffect(() => {
    if (atmosphere?.playlistIds && atmosphere.playlistIds.length > 0) {
      refetchNetease();
    }
  }, [atmosphere?.playlistIds, refetchNetease]);

  // Play netease track when it loads; fallback to generative on failure
  useEffect(() => {
    if (neteaseTrack && !neteaseLoading) {
      retryPlayRef.current(neteaseTrack);
    }
  }, [neteaseTrack, neteaseLoading]);

  // Listen for Orb click play request
  useEffect(() => {
    const handler = () => {
      if (!isPlaying) {
        retryPlayRef.current();
      }
    };
    window.addEventListener('moodrift:request-play', handler);
    return () => window.removeEventListener('moodrift:request-play', handler);
  }, [isPlaying]);

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
      retryPlayRef.current();
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${energy}-${environment}-${activity}-${emotion}-${locale}-${atmosphere?.title}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center"
      >
        {/* Title + Description */}
        <h2 className="text-xl md:text-2xl font-medium tracking-tight text-foreground mb-1">
          {title}
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto mb-2">
          {description}
        </p>
        {atmosphereError && (
          <p className="text-[9px] text-muted-foreground/40 mb-1">
            AI offline · using local preset
          </p>
        )}

        {/* Tags */}
        <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
          <Badge variant="secondary" className="px-2 py-0.5 text-[10px] tracking-wide">
            {bpm} {t('output.bpm')}
          </Badge>
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="px-2 py-0.5 text-[10px] tracking-wide border-border/50 text-muted-foreground cursor-default"
            >
              {tag}
            </Badge>
          ))}
        </div>

        {/* Playback row */}
        <div className="flex items-center justify-center gap-2">
          {/* AI Generate button */}
          <button
            onClick={refetchAtmosphere}
            disabled={atmosphereLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 bg-background/60 backdrop-blur-sm text-[10px] tracking-wider uppercase text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-50"
          >
            {atmosphereLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            <span>{atmosphereLoading ? t('output.curating') : t('output.curate')}</span>
          </button>

          {/* Play / Pause */}
          <button
            onClick={handleTogglePlay}
            disabled={neteaseLoading}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/90 text-primary-foreground text-xs font-medium hover:bg-primary transition-colors disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            {neteaseLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 ml-0.5" />
            )}
            <span>
              {neteaseLoading
                ? 'Loading...'
                : isPlaying
                  ? currentTrack?.name ?? 'Playing'
                  : 'Play Mood'}
            </span>
          </button>
        </div>

        {/* Progress bar */}
        {isPlaying && (
          <div className="mt-2 w-48 mx-auto h-0.5 bg-muted/40 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        {/* Source badge */}
        {currentTrack && (
          <p className="text-[9px] text-muted-foreground/40 mt-1">
            {currentTrack.source === 'netease' ? 'NetEase Cloud Music' : 'Generative Audio'}
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
