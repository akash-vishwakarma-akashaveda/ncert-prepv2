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

/**
 * Returns accessible styling tokens for a given class index (1-based, wraps around 1-6)
 */
export function getClassTileStyle(classSortOrIndex: string | number): ClassTileStyle {
  const numeric = typeof classSortOrIndex === 'string' ? parseInt(classSortOrIndex.replace(/\D/g, ''), 10) : classSortOrIndex;
  const validIndex = isNaN(numeric) || numeric <= 0 ? 1 : ((numeric - 1) % 6) + 1;
  return CLASS_PALETTE[validIndex] || CLASS_PALETTE[1];
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
