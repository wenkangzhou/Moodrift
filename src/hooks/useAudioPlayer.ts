import { useRef, useState, useEffect, useCallback } from 'react';

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const play = useCallback((url: string) => {
    if (!audioRef.current) {
      const audio = new Audio();

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
      });

      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      });

      audio.addEventListener('loadstart', () => setIsLoading(true));
      audio.addEventListener('canplay', () => setIsLoading(false));
      audio.addEventListener('error', () => {
        setIsLoading(false);
        setIsPlaying(false);
      });

      audioRef.current = audio;
    }

    const audio = audioRef.current;

    if (currentTrack === url && isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    if (currentTrack !== url) {
      audio.src = url;
      setCurrentTrack(url);
    }

    audio.play().catch(() => {
      setIsLoading(false);
      setIsPlaying(false);
    });
    setIsPlaying(true);
  }, [currentTrack, isPlaying]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  return { isPlaying, currentTrack, progress, isLoading, play, pause };
}
