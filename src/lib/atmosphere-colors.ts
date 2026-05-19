export interface AtmosphereColors {
  primary: string;
  secondary: string;
  palette: string[];
}

const tagColorMap: Record<string, AtmosphereColors> = {
  // Cool / melancholy / rain
  rain: { primary: '#60A5FA', secondary: '#A78BFA', palette: ['#60A5FA20', '#A78BFA20', '#7DD3FC15'] },
  melancholy: { primary: '#818CF8', secondary: '#C084FC', palette: ['#818CF820', '#C084FC20', '#A78BFA15'] },
  lonely: { primary: '#94A3B8', secondary: '#818CF8', palette: ['#94A3B820', '#818CF820', '#CBD5E115'] },
  night: { primary: '#A78BFA', secondary: '#7DD3FC', palette: ['#7DD3FC20', '#A78BFA20', '#818CF815'] },

  // Warm / happy / energetic
  happy: { primary: '#FBBF24', secondary: '#F472B6', palette: ['#FBBF2420', '#F472B620', '#F9A8D415'] },
  sunset: { primary: '#F472B6', secondary: '#FBBF24', palette: ['#F472B620', '#FBBF2420', '#F9A8D415'] },
  dreamy: { primary: '#F9A8D4', secondary: '#A78BFA', palette: ['#F9A8D420', '#A78BFA20', '#C084FC15'] },

  // Nature / calm / focus
  mountain: { primary: '#34D399', secondary: '#A78BFA', palette: ['#34D39920', '#A78BFA20', '#94A3B815'] },
  city: { primary: '#22D3EE', secondary: '#F472B6', palette: ['#22D3EE20', '#F472B620', '#7DD3FC15'] },
  focus: { primary: '#7DD3FC', secondary: '#34D399', palette: ['#7DD3FC20', '#34D39920', '#60A5FA15'] },
  calm: { primary: '#7DD3FC', secondary: '#A78BFA', palette: ['#7DD3FC20', '#A78BFA20', '#94A3B815'] },
  work: { primary: '#CBD5E1', secondary: '#7DD3FC', palette: ['#CBD5E120', '#7DD3FC20', '#A78BFA15'] },
  drive: { primary: '#F97316', secondary: '#FBBF24', palette: ['#F9731620', '#FBBF2420', '#F472B615'] },
  run: { primary: '#EF4444', secondary: '#F97316', palette: ['#EF444420', '#F9731620', '#FBBF2415'] },
  walk: { primary: '#34D399', secondary: '#7DD3FC', palette: ['#34D39920', '#7DD3FC20', '#60A5FA15'] },
};

const fallback: AtmosphereColors = {
  primary: '#A78BFA',
  secondary: '#7DD3FC',
  palette: ['#7DD3FC20', '#A78BFA20', '#818CF815'],
};

export function getAtmosphereColors(tags: string[]): AtmosphereColors {
  if (tags.length === 0) return fallback;

  // Find the first tag that has a color mapping
  for (const tag of tags) {
    const normalized = tag.toLowerCase().trim();
    if (tagColorMap[normalized]) {
      return tagColorMap[normalized];
    }
  }

  return fallback;
}

export function applyAtmosphereColors(tags: string[]) {
  return getAtmosphereColors(tags);
}
