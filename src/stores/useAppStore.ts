import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Environment = 'rain' | 'city' | 'mountain' | 'night' | 'sunset';
export type Activity = 'run' | 'walk' | 'focus' | 'work' | 'drive';
export type Emotion = 'lonely' | 'dreamy' | 'happy' | 'melancholy';

interface AppState {
  energy: number;
  environment: Environment;
  activity: Activity;
  emotion: Emotion;
  locale: string;
  setEnergy: (v: number) => void;
  setEnvironment: (v: Environment) => void;
  setActivity: (v: Activity) => void;
  setEmotion: (v: Emotion) => void;
  setLocale: (v: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      energy: 50,
      environment: 'night',
      activity: 'focus',
      emotion: 'dreamy',
      locale: 'zh',
      setEnergy: (v) => set({ energy: v }),
      setEnvironment: (v) => set({ environment: v }),
      setActivity: (v) => set({ activity: v }),
      setEmotion: (v) => set({ emotion: v }),
      setLocale: (v) => set({ locale: v }),
    }),
    { name: 'moodrift-storage' }
  )
);
