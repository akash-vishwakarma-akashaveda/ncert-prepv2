export interface ClassTileStyle {
  bg: string;
  text: string;
  border: string;
  badgeBg: string;
  /** Saturated accent for glyphs, progress bars and ledges (EduPlay palette). */
  ink: string;
  name: string;
}

export const CLASS_PALETTE: Record<number, ClassTileStyle> = {
  1: {
    bg: '#FFE9E2',
    text: '#4A1B0C',
    border: '#FFC3B1',
    badgeBg: '#FFC3B1',
    ink: '#E0603F',
    name: 'coral',
  },
  2: {
    bg: '#E1F6EE',
    text: '#04342C',
    border: '#A9E6D3',
    badgeBg: '#A9E6D3',
    ink: '#12A594',
    name: 'teal',
  },
  3: {
    bg: '#EDEAFE',
    text: '#26215C',
    border: '#C7BEF7',
    badgeBg: '#C7BEF7',
    ink: '#7A5BE0',
    name: 'purple',
  },
  4: {
    bg: '#FFF0D8',
    text: '#412402',
    border: '#FFD97A',
    badgeBg: '#FFD97A',
    ink: '#C98A0E',
    name: 'amber',
  },
  5: {
    bg: '#FDE8F1',
    text: '#4B1528',
    border: '#F8BFD6',
    badgeBg: '#F8BFD6',
    ink: '#D2538C',
    name: 'pink',
  },
  6: {
    bg: '#E3EFFF',
    text: '#042C53',
    border: '#B4D0FA',
    badgeBg: '#B4D0FA',
    ink: '#3B4FE0',
    name: 'blue',
  },
};

// Subjects reuse the class palette (SRS 2.2) keyed by name, so "Science" keeps one colour on every screen.
export function getSubjectTileStyle(subject: string): ClassTileStyle {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = (hash * 31 + subject.toLowerCase().charCodeAt(i)) >>> 0;
  }
  return CLASS_PALETTE[(hash % 6) + 1];
}

/** Background colour of each class's Roman numeral artwork (public/roman/class-NN.webp), sampled from the images. */
const ROMAN_ART = ['#62BEE9', '#2D57CF', '#FCD437', '#FF6372', '#49B2AF', '#FAEE41', '#82DEB8', '#FB544A', '#551A87', '#6ED4CD', '#7757BF', '#FC8F34'];

/** Mix two #RRGGBB colours: t = 0 gives a, t = 1 gives b. */
function mix(a: string, b: string, t: number): string {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return '#' + [0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Perceived lightness 0–1, to darken light artwork colours (yellows) more for readable text. */
const lightness = (h: string) => (0.299 * parseInt(h.slice(1, 3), 16) + 0.587 * parseInt(h.slice(3, 5), 16) + 0.114 * parseInt(h.slice(5, 7), 16)) / 255;

/** Class tiles take their colours from their own Roman numeral artwork, so card and picture match. */
const CLASS_TILE_STYLES: ClassTileStyle[] = ROMAN_ART.map((art, i) => {
  const ink = mix(art, '#1E2233', lightness(art) > 0.7 ? 0.6 : lightness(art) > 0.5 ? 0.42 : 0.15);
  return { bg: mix(art, '#FFFFFF', 0.86), border: mix(art, '#FFFFFF', 0.5), badgeBg: mix(art, '#FFFFFF', 0.5), text: mix(art, '#1E2233', 0.75), ink, name: `class-${i + 1}` };
});

/** Styling tokens for a class (1–12), matched to that class's Roman numeral artwork. */
export function getClassTileStyle(classSortOrIndex: string | number): ClassTileStyle {
  const numeric = typeof classSortOrIndex === 'string' ? parseInt(classSortOrIndex.replace(/\D/g, ''), 10) : classSortOrIndex;
  const n = isNaN(numeric) || numeric < 1 ? 1 : ((numeric - 1) % 12) + 1;
  return CLASS_TILE_STYLES[n - 1];
}

export const BRAND_COLORS = {
  primary: '#3B4FE0',
  primaryHover: '#2F40BD',
  secondary: '#12A594',
  secondaryHover: '#0E8577',
  textPrimary: '#1E2233',
  textSecondary: '#6B7280',
  surface: '#FFFFFF',
  bgPage: '#F5F6FA',
  border: '#E3E5EC',
};
