// Akibora palette, shared with the web app.
// Dark  = deep forest green with a little white.
// Light = light green with a little white.

export const fixed = {
  forest: '#0E1F18',
  canopy: '#1A3428',
  moss: '#2F5A45',
  mint: '#7CE3A6',
  sage: '#D5E3D7',
  sageInk: '#0F241A',
  lavender: '#C7BAF5',
  lavenderInk: '#1B1535',
  amber: '#E8A33D',
  onForest: '#EEF4EF',
  onForest2: '#C9DACF',
  onForest3: '#8FAA9B',
};

const light = {
  page: '#E4EEE6',
  surface: '#F6FAF6',
  surface2: '#EDF4EE',
  raised: '#DDE9DF',
  line: '#C6D8CA',
  lineStrong: '#2F5A45',
  ink: '#0F241A',
  ink2: '#2B4637',
  ink3: '#4C6858',
  brand: '#1F6B4A',
  primary: '#0E1F18',
  onPrimary: '#F3F8F4',
  tint: '#D3E6D8',
  amberSoft: '#FBE7C4',
  amberInk: '#6B4108',
  danger: '#B8463A',
  dangerSoft: '#F8DCD8',
  dangerInk: '#7A2318',
};

const dark: typeof light = {
  page: '#0E1F18',
  surface: '#13291F',
  surface2: '#1A3428',
  raised: '#1F3D30',
  line: '#234235',
  lineStrong: '#3D6B54',
  ink: '#EEF4EF',
  ink2: '#B5CBBE',
  ink3: '#8FAA9B',
  brand: '#7CE3A6',
  primary: '#7CE3A6',
  onPrimary: '#0E1F18',
  tint: '#183326',
  amberSoft: '#3A2A10',
  amberInk: '#F3C77A',
  danger: '#F08A7E',
  dangerSoft: '#3A1714',
  dangerInk: '#F6B3AA',
};

export const palettes = { light, dark };
export type Palette = typeof light & typeof fixed & {
  // Older names, kept so every screen reads the new palette
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  primaryDark: string;
};

export function buildPalette(isDark: boolean): Palette {
  const p = isDark ? dark : light;
  return {
    ...fixed,
    ...p,
    background: p.page,
    card: p.surface,
    text: p.ink,
    textSecondary: p.ink2,
    border: p.line,
    primaryDark: p.brand,
  };
}

/** Static values for places outside the theme provider (first loading screen). */
export const colors = {
  primary: light.brand,
  background: { light: light.page, dark: dark.page },
};
