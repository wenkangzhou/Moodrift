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

interface PlayNeteaseOptions {
  fallback?: GenerativeTrack;
  onFail?: () => void;
  timeoutMs?: number;
}

interface AudioStore {
  currentTrack: UnifiedTrack | null;
  isPlaying: boolean;
  progress: number;
  isLoading: boolean;
  playNetease: (track: NeteaseTrack, options?: PlayNeteaseOptions) => Promise<void>;
  playGenerative: (track: GenerativeTrack) => void;
  pause: () => void;
}

export const useAudioStore = create<AudioStore>((set, get) => {
  let audioEl: HTMLAudioElement | null = null;
  let progressTimer: ReturnType<typeof setInterval> | null = null;

  const clearProgress = () => {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  };

  const cleanup = () => {
    clearProgress();
    if (audioEl) {
      audioEl.pause();
      audioEl.src = '';
      audioEl = null;
    }
    getGenerativePlayer().stop(true);
  };

  const startNeteaseProgress = (durationMs: number) => {
    clearProgress();
    progressTimer = setInterval(() => {
      const current = audioEl?.currentTime ?? 0;
      const p = durationMs > 0 ? Math.min(100, (current * 1000 / durationMs) * 100) : 0;
      set({ progress: p });
      if (p >= 100) {
        clearProgress();
        set({ isPlaying: false, progress: 0 });
      }
    }, 300);
  };

  return {
    currentTrack: null,
    isPlaying: false,
    progress: 0,
    isLoading: false,

    playNetease: async (track, options = {}) => {
      const current = get().currentTrack;

      // Resume same track if it was only paused
      if (current?.source === 'netease' && current.neteaseId === track.id && audioEl) {
        try {
          await audioEl.play();
          set({ isPlaying: true });
          startNeteaseProgress(track.duration * 1000);
          return;
        } catch {
          // Fall through to full reload
        }
      }

      // Full reload for a new track
      cleanup();

      const url = await getNeteaseAudioUrl(track.id);
      if (!url) {
        console.warn('[AudioStore] Track unavailable, id:', track.id);
        if (options.onFail) {
          options.onFail();
        } else if (options.fallback) {
          get().playGenerative(options.fallback);
        } else {
          set({ isLoading: false, isPlaying: false });
        }
        return;
      }

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
      const timeoutMs = options.timeoutMs ?? 8000;
      const timeout = setTimeout(() => {
        console.warn('[AudioStore] Netease load timeout, id:', track.id);
        cleanup();
        if (options.onFail) {
          options.onFail();
        } else if (options.fallback) {
          get().playGenerative(options.fallback);
        } else {
          set({ isLoading: false, isPlaying: false });
        }
      }, timeoutMs);

      const clear = () => clearTimeout(timeout);

      const onCanPlay = () => {
        audioEl!.play().catch((err) => {
          console.warn('[AudioStore] Netease play failed:', err);
          clear();
          cleanup();
          if (options.onFail) {
            options.onFail();
          } else if (options.fallback) {
            get().playGenerative(options.fallback);
          } else {
            set({ isLoading: false, isPlaying: false });
          }
        });
      };

      const onPlay = () => {
        hasStarted = true;
        clear();
        set({ isLoading: false, isPlaying: true });
        startNeteaseProgress(track.duration * 1000);
      };

      const onEnded = () => {
        clear();
        cleanup();
        set({ isPlaying: false, progress: 0 });
      };

      const onError = () => {
        console.warn('[AudioStore] Netease audio load error, id:', track.id);
        clear();
        cleanup();
        if (!hasStarted) {
          if (options.onFail) {
            options.onFail();
          } else if (options.fallback) {
            get().playGenerative(options.fallback);
          } else {
            set({ isLoading: false, isPlaying: false });
          }
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
          clearProgress();
          set({ isPlaying: false, progress: 0 });
        });

        set({ isLoading: false, isPlaying: true });
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
      if (audioEl) {
        audioEl.pause();
      }
      getGenerativePlayer().suspend();
      clearProgress();
      set({ isPlaying: false });
    },
  };
});
