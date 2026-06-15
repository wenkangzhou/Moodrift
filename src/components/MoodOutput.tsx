'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, Sparkles } from 'lucide-react';
import { useAudioStore } from '@/stores/useAudioStore';
import { useSongPool } from '@/hooks/useSongPool';
import { useCurate } from '@/hooks/useCurate';
import { Badge } from '@/components/ui/badge';
import type { NeteaseTrack } from '@/lib/netease';
import { applyAtmosphereColors } from '@/lib/atmosphere-colors';
import { useAtmosphereColorStore } from '@/stores/useAtmosphereColorStore';
import { generateMockMood } from '@/lib/moods';
import { logger } from '@/lib/logger';

export function MoodOutput() {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.language;
  const retryPlayRef = useRef<(t?: NeteaseTrack) => void>(() => {});
  const failCountRef = useRef(0);
  const [visualTrack, setVisualTrack] = useState<{ name: string; artist: string } | null>(null);

  const { data: curateData, loading: curateLoading, error: curateError, curate } = useCurate(locale);

  const { currentTrack, isPlaying, isLoading: audioLoading, progress, playNetease, playGenerative, pause } =
    useAudioStore();

  const shouldGenerateAtmosphere = Boolean(currentTrack) || isPlaying || audioLoading;

  const {
    currentSong,
    poolLoading,
    poolError,
    nextSong,
  } = useSongPool(locale, curateData?.playlistIds, shouldGenerateAtmosphere);

  const fallbackTrack = useMemo(
    () => generateMockMood(50, 'night', 'focus', 'dreamy', locale).tracks[0],
    [locale]
  );
  const toVisualTrack = useCallback(
    (track: { name?: string; artist?: string }) => ({
      name: track.name?.trim() || t('output.untitled'),
      artist: track.artist?.trim() || t('output.unknownArtist'),
    }),
    [t]
  );

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

  // Retry helper: auto-advance on timeout/error and auto-play next on song end
  useEffect(() => {
    retryPlayRef.current = (t?: NeteaseTrack) => {
      const target = t ?? currentSong;
      if (target) {
        setVisualTrack(toVisualTrack(target));
        playNetease(target, {
          onFail: () => {
            failCountRef.current += 1;
            if (failCountRef.current >= 3) {
              logger.warn('[MoodOutput] Netease playback failed repeatedly, using generative fallback');
              setVisualTrack(toVisualTrack(fallbackTrack));
              playGenerative(fallbackTrack);
              return;
            }
            const n = nextSong();
            if (n) {
              setTimeout(() => {
                retryPlayRef.current(n);
              }, 300);
            } else {
              setVisualTrack(toVisualTrack(fallbackTrack));
              playGenerative(fallbackTrack);
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
  }, [currentSong, fallbackTrack, playGenerative, playNetease, nextSong, toVisualTrack]);

  const playCurrentOrFallback = useCallback((target?: NeteaseTrack | null) => {
    failCountRef.current = 0;
    const song = target ?? currentSong;
    if (song) {
      setVisualTrack(toVisualTrack(song));
      retryPlayRef.current(song);
    } else {
      setVisualTrack(toVisualTrack(fallbackTrack));
      playGenerative(fallbackTrack);
    }
  }, [currentSong, fallbackTrack, playGenerative, toVisualTrack]);

  const driftToNext = useCallback(() => {
    failCountRef.current = 0;
    const n = nextSong();
    if (n) {
      setVisualTrack(toVisualTrack(n));
      retryPlayRef.current(n);
    } else if (currentSong) {
      setVisualTrack(toVisualTrack(currentSong));
      retryPlayRef.current(currentSong);
    } else {
      setVisualTrack(toVisualTrack(fallbackTrack));
      playGenerative(fallbackTrack);
    }
  }, [currentSong, fallbackTrack, nextSong, playGenerative, toVisualTrack]);

  // Listen for Orb click play request
  useEffect(() => {
    const handler = () => {
      if (!isPlaying) {
        playCurrentOrFallback();
      }
    };
    window.addEventListener('moodrift:request-play', handler);
    return () => window.removeEventListener('moodrift:request-play', handler);
  }, [isPlaying, playCurrentOrFallback]);

  // Listen for Orb swipe drift request
  useEffect(() => {
    const handler = () => {
      driftToNext();
    };
    window.addEventListener('moodrift:request-drift', handler);
    return () => window.removeEventListener('moodrift:request-drift', handler);
  }, [driftToNext]);

  // Keyboard shortcuts: Space = play/pause, Right Arrow = next
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) {
          pause();
        } else {
          playCurrentOrFallback();
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        driftToNext();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [driftToNext, isPlaying, pause, playCurrentOrFallback]);

  // Content to display — song name is shown immediately,文案 fades in when ready
  const firstText = (...values: Array<string | null | undefined>) =>
    values.find((value) => value && value.trim().length > 0) ?? '';
  const displayTrackName = firstText(currentTrack?.name, visualTrack?.name, currentSong?.name);
  const displayArtist = firstText(currentTrack?.artist, visualTrack?.artist, currentSong?.artist);
  const showTitle = firstText(atmosphere?.title, displayTrackName);
  const showDesc = firstText(atmosphere?.description, displayArtist);
  const showTags = atmosphere?.tags?.filter((tag) => tag.trim().length > 0) ?? [];
  const statusLabel = curateLoading
    ? t('output.curating')
    : audioLoading
      ? t('output.entering')
      : isPlaying
          ? t('output.listening')
          : poolLoading
            ? t('output.ready')
            : currentTrack || visualTrack
              ? t('output.suspended')
              : t('output.ready');
  const statusActive = isPlaying || audioLoading || poolLoading || curateLoading;

  return (
    <div
      className="text-center min-h-40"
      data-moodrift-output
      data-audio-state={audioLoading ? 'loading' : isPlaying ? 'playing' : 'idle'}
      data-current-track={currentTrack?.name ?? ''}
      data-current-song={currentSong?.name ?? ''}
      data-visual-track={visualTrack?.name ?? ''}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
          {/* Text content — song name shown immediately,文案 crossfades in when ready */}
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
              <h2 className="text-xl md:text-2xl font-medium tracking-tight text-foreground mb-1">
                {showTitle || t('output.ready')}
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto mb-2">
                {showDesc || statusLabel}
              </p>

              {/* Error / offline states as subtle badges */}
              <div className="flex items-center justify-center gap-1.5 mb-2 flex-wrap">
                {poolError && (
                  <Badge variant="destructive" className="px-2 py-0 text-[10px]">
                    {t(poolError)}
                  </Badge>
                )}
                {hasAtmosphereError && (
                  <Badge variant="outline" className="px-2 py-0 text-[10px] text-muted-foreground/60 border-muted-foreground/20">
                    {t('output.aiOffline')}
                  </Badge>
                )}
              </div>

              {/* Tags — staggered entrance animation */}
              <motion.div
                className="flex items-center justify-center gap-2 mb-2 flex-wrap"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.06 } },
                }}
                initial="hidden"
                animate="visible"
              >
                {showTags.length > 0 ? (
                  showTags.map((tag) => (
                    <motion.div
                      key={tag}
                      variants={{
                        hidden: { opacity: 0, y: 4, scale: 0.92 },
                        visible: { opacity: 1, y: 0, scale: 1 },
                      }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                      <Badge
                        variant="outline"
                        className="px-2 py-0.5 text-[10px] tracking-wide border-border/50 text-muted-foreground cursor-default"
                      >
                        {tag}
                      </Badge>
                    </motion.div>
                  ))
                ) : null}
              </motion.div>
            </motion.div>

          {/* Playback progress */}
          {currentTrack && (
            <div className="mt-3 mx-auto w-full max-w-48 h-0.5 rounded-full bg-muted/30 overflow-hidden">
              <motion.div
                className="h-full bg-primary/70 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'linear' }}
              />
            </div>
          )}

          {/* Ambient status + low-emphasis curate trigger */}
          <motion.div
            className="mt-3 flex items-center justify-center gap-2 text-[10px] text-muted-foreground/55"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            aria-live="polite"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full bg-primary/70 shadow-[0_0_14px_rgba(125,211,252,0.55)] ${statusActive ? 'animate-pulse' : ''}`}
              aria-hidden="true"
            />
            <span className="tracking-wide">{statusLabel}</span>
            <button
              type="button"
              aria-label={t('output.curate')}
              title={t('output.curate')}
              onClick={(e) => {
                e.stopPropagation();
                curate();
              }}
              disabled={curateLoading}
              className="grid h-6 w-6 place-items-center rounded-full border border-border/20 bg-background/10 text-muted-foreground/45 transition-colors hover:border-primary/30 hover:text-primary/80 disabled:opacity-40"
            >
              {curateLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
            </button>
          </motion.div>

          {/* Curate error — badge style */}
          <AnimatePresence>
            {curateError && (
              <motion.div
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 2 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center mt-1"
              >
                <Badge variant="destructive" className="px-2 py-0 text-[10px]">
                  {curateError}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
      </motion.div>
    </div>
  );
}
