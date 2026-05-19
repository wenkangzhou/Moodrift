import { create } from 'zustand';

interface AtmosphereColorState {
  primary: string;
  secondary: string;
  palette: string[];
  setColors: (primary: string, secondary: string, palette: string[]) => void;
  reset: () => void;
}

const DEFAULT_PRIMARY = '#A78BFA';
const DEFAULT_SECONDARY = '#7DD3FC';
const DEFAULT_PALETTE = ['#7DD3FC20', '#A78BFA20', '#818CF815'];

export const useAtmosphereColorStore = create<AtmosphereColorState>((set) => ({
  primary: DEFAULT_PRIMARY,
  secondary: DEFAULT_SECONDARY,
  palette: DEFAULT_PALETTE,
  setColors: (primary, secondary, palette) => set({ primary, secondary, palette }),
  reset: () => set({ primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY, palette: DEFAULT_PALETTE }),
}));
