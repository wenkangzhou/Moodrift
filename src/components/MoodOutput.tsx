'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, Play, SkipForward, Sparkles } from 'lucide-react';
import { useAudioStore } from '@/stores/useAudioStore';
import { useSongPool } from '@/hooks/useSongPool';
import { useCurate } from '@/hooks/useCurate';
import { Badge } from '@/components/ui/badge';
import type { NeteaseTrack } from '@/lib/netease';
import { applyAtmosphereColors } from '@/lib/atmosphere-colors';
import { useAtmosphereColorStore } from '@/stores/useAtmosphereColorStore';

export function MoodOutput() {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.language;
  const retryPlayRef = useRef<(t?: NeteaseTrack) => void>(() => {});
  const failCountRef = useRef(0);
  const autoPlayInitiatedRef = useRef(false);
  const pendingCurateRef = useRef(false);
  const prevCurateLoadingRef = useRef(false);

  const { data: curateData, loading: curateLoading, error: curateError, curate } = useCurate(locale);

  const {
    currentSong,
    poolLoading,
    poolError,
    nextSong,
  } = useSongPool(locale, curateData?.playlistIds);

  const { currentTrack, isPlaying, isLoading: audioLoading, playNetease, pause } =
    useAudioStore();

  const atmosphere = currentSong?.atmosphere;
  const atmosphereStatus = currentSong?.atmosphereStatus ?? 'idle';
  const hasAtmosphereError = atmosphereStatus === 'error';

  // Apply atmosphere tint colors based on AI-generated tags
  const setAtmosphereColors = useAtmosphereColorStore((s) => s.setColors);
  const resetAtmosphereColors = useAtmosphereColorStore((s) => s.reset);

  useEffect(() => {
    if (atmosphere?.tags && atmosphere.tags.length > 0) {
      const colors = applyAtmosphereColors(atmosphere.tags);
      setAtmosphereColors(colors.primary, colors.secondary, colors.palette);
    } else if (!currentSong) {
      resetAtmosphereColors();
    }
  }, [atmosphere?.tags, currentSong, setAtmosphereColors, resetAtmosphereColors]);

  // Auto-play first song as soon as pool is ready — song is primary,文案 secondary
  useEffect(() => {
    if (autoPlayInitiatedRef.current) return;
    if (currentSong && !isPlaying && !audioLoading && !poolLoading) {
      autoPlayInitiatedRef.current = true;
      failCountRef.current = 0;
      retryPlayRef.current(currentSong);
    }
  }, [currentSong, isPlaying, audioLoading, poolLoading]);

  // Detect curate success → mark pending so we play the new pool when it loads
  useEffect(() => {
    const wasLoading = prevCurateLoadingRef.current;
    prevCurateLoadingRef.current = curateLoading;
    if (wasLoading && !curateLoading && !curateError && curateData) {
      pendingCurateRef.current = true;
    }
  }, [curateLoading, curateError, curateData]);

  // When a curate-triggered pool finishes loading, auto-play the new first song
  useEffect(() => {
    if (pendingCurateRef.current && !poolLoading && currentSong) {
      pendingCurateRef.current = false;
      failCountRef.current = 0;
      retryPlayRef.current(currentSong);
    }
  }, [poolLoading, currentSong]);

  // Retry helper: auto-advance on timeout/error and auto-play next on song end
  useEffect(() => {
    retryPlayRef.current = (t?: NeteaseTrack) => {
      const target = t ?? currentSong;
      if (target) {
        playNetease(target, {
          onFail: () => {
            failCountRef.current += 1;
            if (failCountRef.current > 10) {
              console.warn('[MoodOutput] Too many consecutive play failures, stopping retry');
              return;
            }
            const n = nextSong();
            if (n) {
              setTimeout(() => {
                retryPlayRef.current(n);
              }, 300);
            }
          },
          onComplete: () => {
            failCountRef.current = 0;
            const n = nextSong();
            if (n) {
              retryPlayRef.current(n);
            }
          },
        });
      }
    };
  }, [currentSong, playNetease, nextSong]);

  // Listen for Orb click play request
  useEffect(() => {
    const handler = () => {
      if (!isPlaying && currentSong) {
        failCountRef.current = 0;
        retryPlayRef.current(currentSong);
      }
    };
    window.addEventListener('moodrift:request-play', handler);
    return () => window.removeEventListener('moodrift:request-play', handler);
  }, [isPlaying, currentSong]);

  // Listen for Orb swipe drift request
  useEffect(() => {
    const handler = () => {
      failCountRef.current = 0;
      const n = nextSong();
      if (n) {
        retryPlayRef.current(n);
      } else if (currentSong) {
        retryPlayRef.current(currentSong);
      }
    };
    window.addEventListener('moodrift:request-drift', handler);
    return () => window.removeEventListener('moodrift:request-drift', handler);
  }, [currentSong, nextSong]);

  // Keyboard shortcuts: Space = play/pause, Right Arrow = next
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) {
          pause();
        } else if (currentSong) {
          failCountRef.current = 0;
          retryPlayRef.current(currentSong);
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        failCountRef.current = 0;
        const n = nextSong();
        if (n) {
          retryPlayRef.current(n);
        } else if (currentSong) {
          retryPlayRef.current(currentSong);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPlaying, currentSong, nextSong, pause]);

  const handleMainAction = () => {
    if (isPlaying) {
      failCountRef.current = 0;
      const n = nextSong();
      if (n) {
        retryPlayRef.current(n);
      }
    } else if (currentSong) {
      failCountRef.current = 0;
      retryPlayRef.current(currentSong);
    }
  };

  const handleContainerClick = () => {
    if (isPlaying) {
      pause();
    } else if (currentSong) {
      failCountRef.current = 0;
      retryPlayRef.current(currentSong);
    }
  };

  const isBusy = poolLoading; // audioLoading is too brief — causes button flash during song switch

  // Content to display — song name is shown immediately,文案 fades in when ready
  const showTitle = atmosphere?.title ?? currentSong?.name ?? '';
  const showDesc = atmosphere?.description ?? currentSong?.artist ?? '';
  const showTags = atmosphere?.tags ?? [];

  return (
    <div className="text-center cursor-pointer min-h-[140px]" onClick={handleContainerClick}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSong?.id ?? 'empty'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Text content — song name shown immediately,文案 crossfades in when ready */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={atmosphere?.title ?? currentSong?.name ?? 'ready'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl md:text-2xl font-medium tracking-tight text-foreground mb-1">
                {showTitle || t('output.ready')}
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto mb-2">
                {showDesc}
              </p>
              {poolError && (
                <p className="text-xs text-destructive mb-1">
                  {t(poolError)}
                </p>
              )}
              {hasAtmosphereError && (
                <p className="text-[9px] text-muted-foreground/40 mb-1">
                  {t('output.aiOffline')}
                </p>
              )}

              {/* Tags — show artist badge as fallback while文案 loads */}
              <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
                {showTags.length > 0 ? (
                  showTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="px-2 py-0.5 text-[10px] tracking-wide border-border/50 text-muted-foreground cursor-default"
                    >
                      {tag}
                    </Badge>
                  ))
                ) : currentSong ? (
                  <Badge variant="secondary" className="px-2 py-0.5 text-[10px] tracking-wide">
                    {currentSong?.artist ?? '...'}
                  </Badge>
                ) : null}
              </div>
            </motion.div>
          </AnimatePresence>

            {/* Single action button */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMainAction();
                }}
                disabled={isBusy || audioLoading || !currentSong}
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
                    ? t('loading')
                    : isPlaying
                      ? t('output.drift')
                      : t('output.play')}
                </span>
              </button>
            </div>

            {/* AI Curate button */}
            <div className="flex items-center justify-center mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  curate();
                }}
                disabled={curateLoading}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] text-muted-foreground/70 hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-40"
              >
                {curateLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                <span>
                  {curateLoading ? t('output.curating') : t('output.curate')}
                </span>
              </button>
            </div>
            {curateError && (
              <p className="text-[10px] text-destructive/80 mt-1">
                {curateError}
              </p>
            )}

            {/* Source badge */}
            {currentTrack && (
              <p className="text-[9px] text-muted-foreground/40 mt-1">
                {currentTrack.source === 'netease' ? 'NetEase Cloud Music' : 'Generative Audio'}
              </p>
            )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
