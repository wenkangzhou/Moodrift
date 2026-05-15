import { useRef, useState, useEffect, useCallback } from 'react';
import { GenerativePlayer, type GenerativeTrack } from '@/lib/generative-audio';

export function useAudioPlayer() {
  const playerRef = useRef<GenerativePlayer | null>(null);
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
    if (!playerRef.current) {
      playerRef.current = new GenerativePlayer();
    }

    // If same track is already playing, stop it
    if (currentTrack === track.name && isPlaying) {
      playerRef.current.stop();
      setIsPlaying(false);
      setCurrentTrack(null);
      setProgress(0);
      cleanupProgress();
      return;
    }

    setIsLoading(true);

    // Stop current if different track
    if (currentTrack !== track.name) {
      playerRef.current.stop();
    }

    setCurrentTrack(track.name);
    durationRef.current = track.duration;
    startTimeRef.current = Date.now();

    playerRef.current.play(track, () => {
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
  }, [currentTrack, isPlaying, cleanupProgress]);

  const pause = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.stop();
      setIsPlaying(false);
      setProgress(0);
      cleanupProgress();
    }
  }, [cleanupProgress]);

  useEffect(() => {
    return () => {
      cleanupProgress();
      if (playerRef.current) {
        playerRef.current.stop();
      }
    };
  }, [cleanupProgress]);

  return { isPlaying, currentTrack, progress, isLoading, play, pause };
}
