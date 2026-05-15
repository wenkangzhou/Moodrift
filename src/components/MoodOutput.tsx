'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useAtmosphere } from '@/hooks/useAtmosphere';
import { useMusicTracks } from '@/hooks/useSpotifyTracks';
import { generateMockMood } from '@/lib/moods';
import { Badge } from '@/components/ui/badge';
import { AudioPlayer } from '@/components/AudioPlayer';
import Image from 'next/image';

export function MoodOutput() {
  const { energy, environment, activity, emotion } = useAppStore();
  const { t, i18n } = useTranslation('common');
  const locale = i18n.language;

  const {
    data: atmosphere,
    loading: atmosphereLoading,
    error: atmosphereError,
    refetch,
  } = useAtmosphere(energy, environment, activity, emotion, locale);

  const mockMood = useMemo(
    () => generateMockMood(energy, environment, activity, emotion, locale),
    [energy, environment, activity, emotion, locale]
  );

  const title = atmosphere?.title ?? mockMood.title;
  const description = atmosphere?.description ?? mockMood.description;
  const tags = atmosphere?.tags ?? mockMood.tags;
  const bpm = atmosphere?.bpm ?? mockMood.bpm;

  const hasAiData = !!atmosphere;

  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    setActiveTag(null);
  }, [energy, environment, activity, emotion]);

  const searchQuery = useMemo(() => {
    if (activeTag) return activeTag;
    const keywords = [environment, activity, emotion, ...tags.slice(0, 2)];
    return keywords.filter(Boolean).join(' ');
  }, [environment, activity, emotion, tags, activeTag]);

  const {
    tracks: musicTracks,
    loading: tracksLoading,
    error: tracksError,
  } = useMusicTracks(searchQuery);

  const displayTracks =
    musicTracks.length > 0 && !tracksError
      ? musicTracks
      : mockMood.tracks.map((t) => ({
          title: t.title,
          artist: t.artist,
          cover: t.cover,
          previewUrl: null as string | null,
          spotifyUrl: '#',
          genre: t.genre,
        }));

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
            onClick={refetch}
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
              variant={activeTag === tag ? 'secondary' : 'outline'}
              className={`px-3 py-1 text-xs tracking-wide cursor-pointer transition-colors ${
                activeTag === tag
                  ? 'border-primary/50 text-primary'
                  : 'border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
              onClick={() => setActiveTag((prev) => (prev === tag ? null : tag))}
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
            {tracksLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-36 snap-center"
                  >
                    <div className="aspect-square rounded-xl bg-muted/30 animate-pulse mb-3" />
                    <div className="h-4 bg-muted/30 rounded animate-pulse mb-2" />
                    <div className="h-3 bg-muted/20 rounded animate-pulse w-2/3" />
                  </div>
                ))
              : displayTracks.map((track, i) => (
                  <motion.div
                    key={`${track.title}-${i}`}
                    className="flex-shrink-0 w-36 snap-center cursor-pointer group"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    whileHover={{ y: -4 }}
                    onClick={() => {
                      if (track.spotifyUrl && track.spotifyUrl !== '#') {
                        window.open(track.spotifyUrl, '_blank');
                      }
                    }}
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-muted/30">
                      {track.cover ? (
                        <Image
                          src={track.cover}
                          alt={track.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="144px"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted/50" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <AudioPlayer
                        previewUrl={track.previewUrl}
                        trackId={`${track.title}-${i}`}
                      />
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
          {tracksError && (
            <p className="text-[10px] text-center text-muted-foreground/40 mt-1">
              Jamendo offline · using local presets
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
