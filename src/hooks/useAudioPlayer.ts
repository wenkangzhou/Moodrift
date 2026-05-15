import { useAudioStore } from '@/stores/useAudioStore';
import { type GenerativeTrack } from '@/lib/generative-audio';

export function useAudioPlayer() {
  const { currentTrack, isPlaying, progress, isLoading, play, pause } =
    useAudioStore();
  return { currentTrack, isPlaying, progress, isLoading, play, pause };
}
