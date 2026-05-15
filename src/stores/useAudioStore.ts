import { create } from 'zustand';
import { GenerativePlayer, type GenerativeTrack } from '@/lib/generative-audio';

let globalPlayer: GenerativePlayer | null = null;
function getPlayer(): GenerativePlayer {
  if (!globalPlayer) globalPlayer = new GenerativePlayer();
  return globalPlayer;
}

interface AudioStore {
  currentTrack: string | null;
  isPlaying: boolean;
  progress: number;
  isLoading: boolean;
  play: (track: GenerativeTrack) => void;
  pause: () => void;
}

export const useAudioStore = create<AudioStore>((set, get) => {
  let progressTimer: ReturnType<typeof setInterval> | null = null;
  let startTime = 0;
  let durationMs = 0;

  const cleanupProgress = () => {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  };

  return {
    currentTrack: null,
    isPlaying: false,
    progress: 0,
    isLoading: false,

    play: (track) => {
      const player = getPlayer();
      const state = get();

      // Toggle same track -> stop
      if (state.currentTrack === track.name && state.isPlaying) {
        player.stop();
        cleanupProgress();
        set({ isPlaying: false, currentTrack: null, progress: 0 });
        return;
      }

      // Switching tracks: stop previous audio immediately (no fade-out overlap)
      player.stop(true);
      cleanupProgress();

      set({ isLoading: true, currentTrack: track.name, progress: 0 });

      try {
        player.play(track, () => {
          cleanupProgress();
          set({ isPlaying: false, progress: 0 });
        });

        set({ isLoading: false, isPlaying: true, progress: 0 });
        startTime = Date.now();
        durationMs = track.duration * 1000;

        progressTimer = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const p = Math.min(100, (elapsed / durationMs) * 100);
          set({ progress: p });
          if (p >= 100) {
            cleanupProgress();
          }
        }, 300);
      } catch (err) {
        console.error('[AudioStore] Play failed:', err);
        cleanupProgress();
        set({ isLoading: false, isPlaying: false, currentTrack: null, progress: 0 });
      }
    },

    pause: () => {
      const player = getPlayer();
      player.stop(false);
      cleanupProgress();
      set({ isPlaying: false, progress: 0 });
    },
  };
});
