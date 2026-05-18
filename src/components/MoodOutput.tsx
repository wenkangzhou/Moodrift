'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2, Play, Pause, SkipForward } from 'lucide-react';
import { useAudioStore } from '@/stores/useAudioStore';
import { useNeteasePlaylist } from '@/hooks/useNeteasePlaylist';
import { useAtmosphere } from '@/hooks/useAtmosphere';
import { Badge } from '@/components/ui/badge';
import type { NeteaseTrack } from '@/lib/netease';

export function MoodOutput() {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.language;
  const retryPlayRef = useRef<(t?: NeteaseTrack) => void>(() => {});

  const {
    track: neteaseTrack,
    loading: neteaseLoading,
    nextTrack,
  } = useNeteasePlaylist();

  const trackId = neteaseTrack?.id ?? null;

  const {
    data: atmosphere,
    loading: atmosphereLoading,
    error: atmosphereError,
    refetch: refetchAtmosphere,
  } = useAtmosphere(neteaseTrack?.name ?? null, neteaseTrack?.artist ?? null, locale);

  const { currentTrack, isPlaying, progress, playNetease, pause } =
    useAudioStore();

  // Retry helper: auto-advance on timeout/error
  useEffect(() => {
    retryPlayRef.current = (t?: NeteaseTrack) => {
      const target = t ?? neteaseTrack;
      if (target) {
        playNetease(target, {
          onFail: () => {
            const n = nextTrack();
            if (n) {
              retryPlayRef.current(n);
            }
          },
        });
      }
    };
  }, [neteaseTrack, playNetease, nextTrack]);

  // Auto-play when track loads
  useEffect(() => {
    if (neteaseTrack && !neteaseLoading) {
      retryPlayRef.current(neteaseTrack);
    }
  }, [neteaseTrack, neteaseLoading]);

  // Auto-fetch AI description when track changes
  useEffect(() => {
    if (trackId) {
      refetchAtmosphere();
    }
  }, [trackId, refetchAtmosphere]);

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

  const handleTogglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      retryPlayRef.current();
    }
  };

  const handleNext = () => {
    const n = nextTrack();
    if (n) {
      retryPlayRef.current(n);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={neteaseTrack?.id ?? 'empty'}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center"
      >
        {/* Title + Description */}
        <h2 className="text-xl md:text-2xl font-medium tracking-tight text-foreground mb-1">
          {atmosphere?.title ?? neteaseTrack?.name ?? t('output.ready')}
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto mb-2">
          {atmosphere?.description ?? neteaseTrack?.artist ?? ''}
        </p>
        {atmosphereError && (
          <p className="text-[9px] text-muted-foreground/40 mb-1">
            AI offline
          </p>
        )}

        {/* Tags */}
        <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
          {atmosphere?.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="px-2 py-0.5 text-[10px] tracking-wide border-border/50 text-muted-foreground cursor-default"
            >
              {tag}
            </Badge>
          )) ?? (
            <Badge variant="secondary" className="px-2 py-0.5 text-[10px] tracking-wide">
              {neteaseTrack?.artist ?? '...'}
            </Badge>
          )}
        </div>

        {/* Playback row */}
        <div className="flex items-center justify-center gap-2">
          {/* AI Describe button */}
          <button
            onClick={refetchAtmosphere}
            disabled={atmosphereLoading || !neteaseTrack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 bg-background/60 backdrop-blur-sm text-[10px] tracking-wider uppercase text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-50"
          >
            {atmosphereLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            <span>{t('output.curate')}</span>
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

          {/* Next track */}
          <button
            onClick={handleNext}
            disabled={neteaseLoading || !neteaseTrack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 bg-background/60 backdrop-blur-sm text-[10px] tracking-wider uppercase text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-50"
          >
            <SkipForward className="w-3 h-3" />
            <span>{t('output.next')}</span>
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
