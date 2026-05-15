import { useState, useEffect, useCallback, useRef } from 'react';
import { GenerativePlayer, type GenerativeTrack } from '@/lib/generative-audio';

// Global singleton player shared across all AudioPlayer instances
let globalPlayer: GenerativePlayer | null = null;

function getGlobalPlayer(): GenerativePlayer {
  if (!globalPlayer) globalPlayer = new GenerativePlayer();
  return globalPlayer;
}

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);

  const cleanupProgress = useCallback(() => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }, []);

  const play = useCallback((track: GenerativeTrack) => {
    try {
      const player = getGlobalPlayer();

      // If same track is already playing, stop it (toggle behavior)
      if (currentTrack === track.name && isPlaying) {
        player.stop();
        setIsPlaying(false);
        setCurrentTrack(null);
        setProgress(0);
        cleanupProgress();
        return;
      }

      setIsLoading(true);

      // Stop any currently playing track before starting new one
      player.stop();

      setCurrentTrack(track.name);
      durationRef.current = track.duration;
      startTimeRef.current = Date.now();

      player.play(track, () => {
        setIsPlaying(false);
        setProgress(0);
        cleanupProgress();
      });

      setIsLoading(false);
      setIsPlaying(true);
      setProgress(0);

      cleanupProgress();
      progressTimer.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const p = Math.min(100, (elapsed / durationRef.current) * 100);
        setProgress(p);
        if (p >= 100) {
          cleanupProgress();
        }
      }, 300);
    } catch (err) {
      console.error('[useAudioPlayer] Play failed:', err);
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, [currentTrack, isPlaying, cleanupProgress]);

  const pause = useCallback(() => {
    try {
      const player = getGlobalPlayer();
      player.stop();
      setIsPlaying(false);
      setProgress(0);
      cleanupProgress();
    } catch {}
  }, [cleanupProgress]);

  useEffect(() => {
    return () => {
      cleanupProgress();
    };
  }, [cleanupProgress]);

  return { isPlaying, currentTrack, progress, isLoading, play, pause };
}
