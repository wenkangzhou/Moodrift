import { create } from 'zustand';
import { GenerativePlayer, type GenerativeTrack } from '@/lib/generative-audio';
import { getNeteaseAudioUrl, type NeteaseTrack } from '@/lib/netease';

let globalPlayer: GenerativePlayer | null = null;
function getGenerativePlayer(): GenerativePlayer {
  if (!globalPlayer) globalPlayer = new GenerativePlayer();
  return globalPlayer;
}

export type TrackSource = 'netease' | 'generative';

export interface UnifiedTrack {
  name: string;
  artist: string;
  cover?: string;
  duration: number;
  source: TrackSource;
  neteaseId?: number;
  generativeData?: GenerativeTrack;
}

interface AudioStore {
  currentTrack: UnifiedTrack | null;
  isPlaying: boolean;
  progress: number;
  isLoading: boolean;
  playNetease: (track: NeteaseTrack, fallback?: GenerativeTrack) => void;
  playGenerative: (track: GenerativeTrack) => void;
  pause: () => void;
}

export const useAudioStore = create<AudioStore>((set, get) => {
  let audioEl: HTMLAudioElement | null = null;
  let progressTimer: ReturnType<typeof setInterval> | null = null;

  const cleanup = () => {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
    if (audioEl) {
      audioEl.pause();
      audioEl.src = '';
      audioEl = null;
    }
    getGenerativePlayer().stop(true);
  };

  const startProgress = (durationMs: number) => {
    progressTimer = setInterval(() => {
      const current = audioEl?.currentTime ?? 0;
      const p = durationMs > 0 ? Math.min(100, (current * 1000 / durationMs) * 100) : 0;
      set({ progress: p });
      if (p >= 100) {
        clearInterval(progressTimer!);
        progressTimer = null;
        set({ isPlaying: false, progress: 0 });
      }
    }, 300);
  };

  return {
    currentTrack: null,
    isPlaying: false,
    progress: 0,
    isLoading: false,

    playNetease: (track, fallback) => {
      cleanup();

      const url = getNeteaseAudioUrl(track.id);
      audioEl = new Audio(url);
      // Do NOT set crossOrigin — Netease does not send CORS headers,
      // and plain <audio> can still play cross-domain without it.

      const unified: UnifiedTrack = {
        name: track.name,
        artist: track.artist,
        cover: track.cover,
        duration: track.duration,
        source: 'netease',
        neteaseId: track.id,
      };

      set({ isLoading: true, currentTrack: unified, progress: 0 });

      let hasStarted = false;

      const onCanPlay = () => {
        audioEl!.play().catch((err) => {
          console.warn('[AudioStore] Netease play failed:', err);
          cleanup();
          if (fallback) {
            get().playGenerative(fallback);
          } else {
            set({ isLoading: false, isPlaying: false });
          }
        });
      };

      const onPlay = () => {
        hasStarted = true;
        set({ isLoading: false, isPlaying: true, progress: 0 });
        startProgress(track.duration * 1000);
      };

      const onEnded = () => {
        cleanup();
        set({ isPlaying: false, progress: 0 });
      };

      const onError = () => {
        console.warn('[AudioStore] Netease audio load error, id:', track.id);
        cleanup();
        if (!hasStarted && fallback) {
          get().playGenerative(fallback);
        } else {
          set({ isLoading: false, isPlaying: false });
        }
      };

      audioEl.addEventListener('canplaythrough', onCanPlay, { once: true });
      audioEl.addEventListener('play', onPlay, { once: true });
      audioEl.addEventListener('ended', onEnded, { once: true });
      audioEl.addEventListener('error', onError, { once: true });
    },

    playGenerative: (track) => {
      cleanup();

      const unified: UnifiedTrack = {
        name: track.name,
        artist: track.artist,
        duration: track.duration,
        source: 'generative',
        generativeData: track,
      };

      set({ isLoading: true, currentTrack: unified, progress: 0 });

      try {
        const player = getGenerativePlayer();
        player.play(track, () => {
          if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
          }
          set({ isPlaying: false, progress: 0 });
        });

        set({ isLoading: false, isPlaying: true, progress: 0 });
        const durationMs = track.duration * 1000;
        const startTime = Date.now();
        progressTimer = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const p = Math.min(100, (elapsed / durationMs) * 100);
          set({ progress: p });
          if (p >= 100) {
            clearInterval(progressTimer!);
            progressTimer = null;
          }
        }, 300);
      } catch (err) {
        console.error('[AudioStore] Generative play failed:', err);
        cleanup();
        set({ isLoading: false, isPlaying: false, currentTrack: null, progress: 0 });
      }
    },

    pause: () => {
      cleanup();
      set({ isPlaying: false, progress: 0 });
    },
  };
});
