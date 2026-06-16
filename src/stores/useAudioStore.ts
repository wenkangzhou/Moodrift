import { create } from 'zustand';
import { GenerativePlayer, type GenerativeTrack } from '@/lib/generative-audio';
import { getNeteaseAudioUrl, type NeteaseTrack } from '@/lib/netease';
import { logger } from '@/lib/logger';

let globalPlayer: GenerativePlayer | null = null;
function getGenerativePlayer(): GenerativePlayer {
  if (!globalPlayer) globalPlayer = new GenerativePlayer();
  return globalPlayer;
}

function setupMediaSession(track: UnifiedTrack) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

  const artwork = track.cover
    ? [{ src: track.cover, sizes: '512x512', type: 'image/jpeg' }]
    : [];

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.name,
    artist: track.artist,
    artwork,
  });

  navigator.mediaSession.setActionHandler('play', () => {
    window.dispatchEvent(new CustomEvent('moodrift:request-play'));
  });

  navigator.mediaSession.setActionHandler('pause', () => {
    useAudioStore.getState().pause();
  });

  navigator.mediaSession.setActionHandler('nexttrack', () => {
    window.dispatchEvent(new CustomEvent('moodrift:request-drift'));
  });

  navigator.mediaSession.setActionHandler('previoustrack', () => {
    window.dispatchEvent(new CustomEvent('moodrift:request-play'));
  });

  if ('setPositionState' in navigator.mediaSession) {
    navigator.mediaSession.setPositionState({
      duration: track.duration,
      playbackRate: 1,
      position: 0,
    });
  }
}

function updateMediaSessionPosition(position: number, duration: number) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
  try {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate: 1,
      position,
    });
  } catch {
    // ignore
  }
}

function setMediaSessionPlaybackState(state: 'playing' | 'paused' | 'none') {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = state;
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
  onComplete?: () => void;
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

  const hardStopEl = (el: HTMLAudioElement | null) => {
    if (!el) return;
    try { el.pause(); } catch {}
    try { el.src = ''; } catch {}
  };

  const stopCurrent = () => {
    clearProgress();
    if (audioEl) {
      hardStopEl(audioEl);
      audioEl = null;
    }
    getGenerativePlayer().stop(true);
  };

  const failNeteasePlayback = (
    el: HTMLAudioElement,
    options: PlayNeteaseOptions,
    fallbackState: Partial<AudioStore> = {}
  ) => {
    hardStopEl(el);
    if (audioEl === el) audioEl = null;
    clearProgress();
    set({
      isLoading: false,
      isPlaying: false,
      progress: 0,
      ...fallbackState,
    });
    setMediaSessionPlaybackState('paused');

    if (options.onFail) {
      options.onFail();
    } else if (options.fallback) {
      get().playGenerative(options.fallback);
    }
  };

  const startNeteaseProgress = (durationMs: number) => {
    clearProgress();
    const durationSec = durationMs / 1000;
    progressTimer = setInterval(() => {
      const current = audioEl?.currentTime ?? 0;
      const p = durationMs > 0 ? Math.min(100, (current * 1000 / durationMs) * 100) : 0;
      set({ progress: p });
      updateMediaSessionPosition(current, durationSec);
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

      // Hard stop the old audio — no crossfade overlap allowed
      stopCurrent();

      const unified: UnifiedTrack = {
        name: track.name,
        artist: track.artist,
        cover: track.cover,
        duration: track.duration,
        source: 'netease',
        neteaseId: track.id,
      };

      set({ isLoading: true, isPlaying: false, currentTrack: unified, progress: 0 });
      setupMediaSession(unified);
      setMediaSessionPlaybackState('playing');

      const isCurrentTrack = () => {
        const latest = get().currentTrack;
        return latest?.source === 'netease' && latest.neteaseId === track.id;
      };

      const timeoutMs = options.timeoutMs ?? 8000;
      const url = await getNeteaseAudioUrl(track.id, timeoutMs);
      if (!isCurrentTrack()) return;

      if (!url) {
        logger.warn('[AudioStore] Track unavailable, id:', track.id);
        set({ isLoading: false, isPlaying: false, progress: 0 });
        setMediaSessionPlaybackState('paused');
        if (options.onFail) {
          options.onFail();
        } else if (options.fallback) {
          get().playGenerative(options.fallback);
        }
        return;
      }

      const myEl = new Audio(url);
      myEl.volume = 0;
      myEl.preload = 'auto';
      audioEl = myEl;
      // Do NOT set crossOrigin — Netease does not send CORS headers,
      // and plain <audio> can still play cross-domain without it.

      const isCurrentEl = () => audioEl === myEl;

      let hasStarted = false;
      let playAttempted = false;
      const timeout = setTimeout(() => {
        if (!isCurrentEl()) return;
        logger.warn('[AudioStore] Netease load timeout, id:', track.id);
        failNeteasePlayback(myEl, options);
      }, timeoutMs);

      const clear = () => clearTimeout(timeout);

      const onCanPlay = () => {
        if (!isCurrentEl()) return;
        if (playAttempted) return;
        playAttempted = true;
        myEl.play().catch((err) => {
          if (!isCurrentEl()) return;
          logger.warn('[AudioStore] Netease play failed:', err);
          clear();
          failNeteasePlayback(myEl, options);
        });
      };

      const onPlay = () => {
        if (!isCurrentEl()) return;
        hasStarted = true;
        clear();
        set({ isLoading: false, isPlaying: true });
        setMediaSessionPlaybackState('playing');
        startNeteaseProgress(track.duration * 1000);

        // Fade in volume over 600ms
        const fadeSteps = 24;
        const fadeStepMs = 25;
        const increment = 1 / fadeSteps;
        let f = 0;
        const fadeIn = () => {
          if (!isCurrentEl()) return;
          f++;
          myEl.volume = Math.min(1, myEl.volume + increment);
          if (f < fadeSteps) setTimeout(fadeIn, fadeStepMs);
        };
        fadeIn();
      };

      const onEnded = () => {
        if (!isCurrentEl()) return;
        clear();
        hardStopEl(myEl);
        if (audioEl === myEl) audioEl = null;
        clearProgress();
        set({ isPlaying: false, progress: 0 });
        options.onComplete?.();
      };

      const onError = () => {
        if (!isCurrentEl()) return;
        logger.warn('[AudioStore] Netease audio load error, id:', track.id);
        clear();
        if (!hasStarted) {
          failNeteasePlayback(myEl, options);
        }
      };

      myEl.addEventListener('canplay', onCanPlay, { once: true });
      myEl.addEventListener('canplaythrough', onCanPlay, { once: true });
      myEl.addEventListener('play', onPlay, { once: true });
      myEl.addEventListener('ended', onEnded, { once: true });
      myEl.addEventListener('error', onError, { once: true });
      myEl.load();
    },

    playGenerative: (track) => {
      // Hard stop netease audio before generative starts
      clearProgress();
      if (audioEl) {
        const oldEl = audioEl;
        audioEl = null;
        hardStopEl(oldEl);
      }
      getGenerativePlayer().stop(true);

      const unified: UnifiedTrack = {
        name: track.name,
        artist: track.artist,
        duration: track.duration,
        source: 'generative',
        generativeData: track,
      };

      set({ isLoading: true, currentTrack: unified, progress: 0 });
      setupMediaSession(unified);

      try {
        const player = getGenerativePlayer();
        player.play(track, () => {
          clearProgress();
          set({ isPlaying: false, progress: 0 });
          setMediaSessionPlaybackState('none');
        });

        set({ isLoading: false, isPlaying: true });
        setMediaSessionPlaybackState('playing');
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
        logger.error('[AudioStore] Generative play failed:', err);
        stopCurrent();
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
      setMediaSessionPlaybackState('paused');
    },
  };
});
