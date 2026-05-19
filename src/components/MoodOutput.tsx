'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, Play, SkipForward, Music, Sparkles } from 'lucide-react';
import { useAudioStore } from '@/stores/useAudioStore';
import { useNeteasePlaylist } from '@/hooks/useNeteasePlaylist';
import { useAtmosphere } from '@/hooks/useAtmosphere';
import { useCurate } from '@/hooks/useCurate';
import { Badge } from '@/components/ui/badge';
import type { NeteaseTrack } from '@/lib/netease';
import { applyAtmosphereColors } from '@/lib/atmosphere-colors';
import { useAtmosphereColorStore } from '@/stores/useAtmosphereColorStore';

const DISPLAY_TIMEOUT_MS = 7000;

export function MoodOutput() {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.language;
  const retryPlayRef = useRef<(t?: NeteaseTrack) => void>(() => {});
  const failCountRef = useRef(0);

  const { data: curateData, loading: curateLoading, error: curateError, curate } = useCurate(locale);

  const {
    track: neteaseTrack,
    loading: neteaseLoading,
    error: neteaseError,
    nextTrack,
  } = useNeteasePlaylist(curateData?.playlistIds);

  const {
    data: atmosphere,
    loading: atmosphereLoading,
    error: atmosphereError,
  } = useAtmosphere(neteaseTrack?.name ?? null, neteaseTrack?.artist ?? null, locale);

  const { currentTrack, isPlaying, isLoading: audioLoading, playNetease, pause } =
    useAudioStore();

  // Unified display readiness: wait for atmosphere (or timeout) before showing content
  const [displayReady, setDisplayReady] = useState(false);

  // Apply atmosphere tint colors based on AI-generated tags
  const setAtmosphereColors = useAtmosphereColorStore((s) => s.setColors);
  const resetAtmosphereColors = useAtmosphereColorStore((s) => s.reset);

  useEffect(() => {
    if (atmosphere?.tags && atmosphere.tags.length > 0) {
      const colors = applyAtmosphereColors(atmosphere.tags);
      setAtmosphereColors(colors.primary, colors.secondary, colors.palette);
    } else if (!neteaseTrack) {
      resetAtmosphereColors();
    }
  }, [atmosphere?.tags, neteaseTrack, setAtmosphereColors, resetAtmosphereColors]);

  useEffect(() => {
    if (!neteaseTrack) {
      const raf = requestAnimationFrame(() => setDisplayReady(false));
      return () => cancelAnimationFrame(raf);
    }
    // Reset when track changes
    const raf1 = requestAnimationFrame(() => setDisplayReady(false));
    const timer = setTimeout(() => {
      const raf2 = requestAnimationFrame(() => setDisplayReady(true));
      return () => cancelAnimationFrame(raf2);
    }, DISPLAY_TIMEOUT_MS);
    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(timer);
    };
  }, [neteaseTrack?.id, neteaseTrack]);

  useEffect(() => {
    if (atmosphere || atmosphereError) {
      const raf = requestAnimationFrame(() => setDisplayReady(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [atmosphere, atmosphereError]);

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

  // Listen for Orb swipe drift request
  useEffect(() => {
    const handler = () => {
      failCountRef.current = 0;
      const n = nextTrack();
      if (n) {
        retryPlayRef.current(n);
      } else if (neteaseTrack) {
        retryPlayRef.current(neteaseTrack);
      }
    };
    window.addEventListener('moodrift:request-drift', handler);
    return () => window.removeEventListener('moodrift:request-drift', handler);
  }, [neteaseTrack, nextTrack]);

  const handleMainAction = () => {
    if (isPlaying) {
      failCountRef.current = 0;
      const n = nextTrack();
      if (n) {
        retryPlayRef.current(n);
      }
    } else if (neteaseTrack) {
      failCountRef.current = 0;
      retryPlayRef.current(neteaseTrack);
    }
  };

  const handleContainerClick = () => {
    if (isPlaying) {
      pause();
    } else if (neteaseTrack) {
      failCountRef.current = 0;
      retryPlayRef.current(neteaseTrack);
    }
  };

  const isBusy = neteaseLoading || audioLoading || atmosphereLoading;
  const showLoading = !displayReady && neteaseTrack !== null;

  // Content to display
  const showTitle = atmosphere?.title ?? (displayReady && atmosphereError ? neteaseTrack?.name : '');
  const showDesc = atmosphere?.description ?? (displayReady && atmosphereError ? neteaseTrack?.artist : '');
  const showTags = atmosphere?.tags ?? [];

  return (
    <div className="text-center cursor-pointer min-h-[140px]" onClick={handleContainerClick}>
      <AnimatePresence mode="wait">
        {showLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center gap-3 py-6"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full border border-primary/20 flex items-center justify-center">
                <Music className="w-4 h-4 text-primary/60 animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border border-primary/10 animate-ping" />
            </div>
            <p className="text-xs text-muted-foreground/60 tracking-wide">
              {t('output.listening')}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={neteaseTrack?.id ?? 'empty'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* Title + Description */}
            <h2 className="text-xl md:text-2xl font-medium tracking-tight text-foreground mb-1">
              {showTitle || t('output.ready')}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto mb-2">
              {showDesc}
            </p>
            {neteaseError && (
              <p className="text-xs text-destructive mb-1">
                {neteaseError}
              </p>
            )}
            {atmosphereError && displayReady && (
              <p className="text-[9px] text-muted-foreground/40 mb-1">
                AI offline
              </p>
            )}

            {/* Tags */}
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
              ) : displayReady && atmosphereError ? (
                <Badge variant="secondary" className="px-2 py-0.5 text-[10px] tracking-wide">
                  {neteaseTrack?.artist ?? '...'}
                </Badge>
              ) : null}
            </div>

            {/* Single action button */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMainAction();
                }}
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
        )}
      </AnimatePresence>
    </div>
  );
}
