'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, Play, SkipForward } from 'lucide-react';
import { useAudioStore } from '@/stores/useAudioStore';
import { useNeteasePlaylist } from '@/hooks/useNeteasePlaylist';
import { useAtmosphere } from '@/hooks/useAtmosphere';
import { Badge } from '@/components/ui/badge';
import type { NeteaseTrack } from '@/lib/netease';

export function MoodOutput() {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.language;
  const retryPlayRef = useRef<(t?: NeteaseTrack) => void>(() => {});
  const failCountRef = useRef(0);

  const {
    track: neteaseTrack,
    loading: neteaseLoading,
    error: neteaseError,
    nextTrack,
  } = useNeteasePlaylist();

  const {
    data: atmosphere,
    loading: atmosphereLoading,
    error: atmosphereError,
  } = useAtmosphere(neteaseTrack?.name ?? null, neteaseTrack?.artist ?? null, locale);

  const { currentTrack, isPlaying, isLoading: audioLoading, progress, playNetease } =
    useAudioStore();

  // Retry helper: auto-advance on timeout/error
  useEffect(() => {
    retryPlayRef.current = (t?: NeteaseTrack) => {
      const target = t ?? neteaseTrack;
      if (target) {
        playNetease(target, {
          onFail: () => {
            failCountRef.current += 1;
            if (failCountRef.current > 10) {
              console.warn('[MoodOutput] Too many consecutive play failures, stopping retry');
              return;
            }
            const n = nextTrack();
            if (n) {
              setTimeout(() => {
                retryPlayRef.current(n);
              }, 300);
            }
          },
        });
      }
    };
  }, [neteaseTrack, playNetease, nextTrack]);

  // Listen for Orb click play request
  useEffect(() => {
    const handler = () => {
      if (!isPlaying && neteaseTrack) {
        failCountRef.current = 0;
        retryPlayRef.current(neteaseTrack);
      }
    };
    window.addEventListener('moodrift:request-play', handler);
    return () => window.removeEventListener('moodrift:request-play', handler);
  }, [isPlaying, neteaseTrack]);

  const handleMainAction = () => {
    if (isPlaying) {
      // Playing → skip to next track and play
      failCountRef.current = 0;
      const n = nextTrack();
      if (n) {
        retryPlayRef.current(n);
      }
    } else if (neteaseTrack) {
      // Not playing → start playing
      failCountRef.current = 0;
      retryPlayRef.current(neteaseTrack);
    }
  };

  const isBusy = neteaseLoading || audioLoading || atmosphereLoading;

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
        {neteaseError && (
          <p className="text-xs text-destructive mb-1">
            {neteaseError}
          </p>
        )}
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

        {/* Single action button */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={handleMainAction}
            disabled={isBusy || !neteaseTrack}
            className="flex items-center gap-2 px-6 py-2 rounded-full bg-primary/90 text-primary-foreground text-xs font-medium hover:bg-primary transition-colors disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            {isBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPlaying ? (
              <SkipForward className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
            <span>
              {isBusy
                ? 'Loading...'
                : isPlaying
                  ? t('output.drift')
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
