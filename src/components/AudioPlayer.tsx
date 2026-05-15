'use client';

import { Play, Pause } from 'lucide-react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

interface AudioPlayerProps {
  previewUrl: string | null;
  trackId: string;
}

export function AudioPlayer({ previewUrl, trackId }: AudioPlayerProps) {
  const { isPlaying, currentTrack, progress, play, pause } = useAudioPlayer();

  if (!previewUrl) return null;

  const isThisPlaying = isPlaying && currentTrack === previewUrl;

  const toggle = () => {
    if (isThisPlaying) {
      pause();
    } else {
      play(previewUrl);
    }
  };

  return (
    <div className="absolute bottom-2 right-2 z-10">
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 text-foreground hover:bg-background transition-colors"
      >
        {isThisPlaying ? (
          <Pause className="w-3.5 h-3.5" />
        ) : (
          <Play className="w-3.5 h-3.5 ml-0.5" />
        )}
      </button>
      {isThisPlaying && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
