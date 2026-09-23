export type EducationalStage = 'primary' | 'middle' | 'senior';

export interface StageThemeConfig {
  stage: EducationalStage;
  label: string;
  badge: string;
  iconName: string;
  greeting: string;
  subGreeting: string;
  cardRadius: string;
  accentGradient: string;
  primaryColor: string;
  secondaryColor: string;
  tagColor: string;
  bgTint: string;
  levelTitle: string;
}

export const STAGE_CONFIGS: Record<EducationalStage, StageThemeConfig> = {
  primary: {
    stage: 'primary',
    label: 'Primary Foundation (Class 1–5)',
    badge: 'Foundation Learning',
    iconName: 'Sparkles',
    greeting: 'Welcome to your learning adventure!',
    subGreeting: 'Build core fundamentals with bite-sized, structured video lessons.',
    cardRadius: 'rounded-2xl',
    accentGradient: 'from-amber-500 via-orange-500 to-rose-500',
    primaryColor: '#F59E0B', // Sunshine Amber
    secondaryColor: '#EC4899', // Playful Pink
    tagColor: '#10B981', // Emerald
    bgTint: 'bg-amber-50/40',
    levelTitle: 'Foundation Explorer',
  },
  middle: {
    stage: 'middle',
    label: 'Foundations & Boards (Class 6–10)',
    badge: 'Board Exam Focus',
    iconName: 'BookOpen',
    greeting: 'Ready for today’s structured revision target?',
    subGreeting: 'NCERT syllabus mastery with Pomodoro focus sessions and progress tracking.',
    cardRadius: 'rounded-2xl',
    accentGradient: 'from-[#3B4FE0] via-indigo-600 to-[#12A594]',
    primaryColor: '#3B4FE0', // Indigo
    secondaryColor: '#12A594', // Teal
    tagColor: '#3B4FE0',
    bgTint: 'bg-[#F5F6FA]',
    levelTitle: 'Revision Scholar',
  },
  senior: {
    stage: 'senior',
    label: 'Senior Secondary & Entrance (Class 11–12)',
    badge: 'High-Yield Intensive',
    iconName: 'GraduationCap',
    greeting: 'Targeted Concept Sprint & Entrance Readiness',
    subGreeting: 'High-yield one-shot lectures, formula cheat sheets, and PYQ alignment.',
    cardRadius: 'rounded-xl',
    accentGradient: 'from-slate-900 via-indigo-950 to-blue-900',
    primaryColor: '#1E293B', // Slate 800
    secondaryColor: '#2563EB', // Electric Blue
    tagColor: '#6366F1', // Indigo
    bgTint: 'bg-slate-50',
    levelTitle: 'Senior Aspirant',
  },
};

/**
 * Maps a class number (1-12) to its educational stage
 */
export function getGradeStage(classSortOrIndex: string | number): EducationalStage {
  const numeric = typeof classSortOrIndex === 'string'
    ? parseInt(classSortOrIndex.replace(/\D/g, ''), 10)
    : classSortOrIndex;

  if (isNaN(numeric) || numeric <= 5) {
    return 'primary';
  }
  if (numeric <= 10) {
    return 'middle';
  }
  return 'senior';
}

export function getStageConfig(classSortOrIndex: string | number): StageThemeConfig {
  const stage = getGradeStage(classSortOrIndex);
  return STAGE_CONFIGS[stage];
}

export interface ClassCardStyle {
  class_sort: string;
  class_display: string;
  iconName: string;
  bgGradient: string;
  border: string;
  textColor: string;
  badgeBg: string;
  accent: string;
}

export const CLASS_CARD_STYLES: Record<string, ClassCardStyle> = {
  '01': {
    class_sort: '01',
    class_display: 'Class 1',
    iconName: 'Sparkles',
    bgGradient: 'from-[#FFE4E6] to-[#FED7AA]',
    border: '#FCA5A5',
    textColor: '#881337',
    badgeBg: '#FFE4E6',
    accent: '#E11D48',
  },
  '02': {
    class_sort: '02',
    class_display: 'Class 2',
    iconName: 'Compass',
    bgGradient: 'from-[#FEF08A] to-[#BBF7D0]',
    border: '#86EFAC',
    textColor: '#14532D',
    badgeBg: '#DCFCE7',
    accent: '#16A34A',
  },
  '03': {
    class_sort: '03',
    class_display: 'Class 3',
    iconName: 'Palette',
    bgGradient: 'from-[#E0E7FF] to-[#DDD6FE]',
    border: '#C7D2FE',
    textColor: '#312E81',
    badgeBg: '#EEF2FF',
    accent: '#4F46E5',
  },
  '04': {
    class_sort: '04',
    class_display: 'Class 4',
    iconName: 'Rocket',
    bgGradient: 'from-[#BAE6FD] to-[#C7D2FE]',
    border: '#7DD3FC',
    textColor: '#0C4A6E',
    badgeBg: '#E0F2FE',
    accent: '#0284C7',
  },
  '05': {
    class_sort: '05',
    class_display: 'Class 5',
    iconName: 'Shapes',
    bgGradient: 'from-[#FED7AA] to-[#FDE047]',
    border: '#FDBA74',
    textColor: '#7C2D12',
    badgeBg: '#FFEDD5',
    accent: '#EA580C',
  },
  '06': {
    class_sort: '06',
    class_display: 'Class 6',
    iconName: 'BookOpen',
    bgGradient: 'from-[#E0F2FE] to-[#BAE6FD]',
    border: '#7DD3FC',
    textColor: '#0369A1',
    badgeBg: '#E0F2FE',
    accent: '#0284C7',
  },
  '07': {
    class_sort: '07',
    class_display: 'Class 7',
    iconName: 'Zap',
    bgGradient: 'from-[#EEF2FF] to-[#E0E7FF]',
    border: '#C7D2FE',
    textColor: '#3730A3',
    badgeBg: '#EEF2FF',
    accent: '#4F46E5',
  },
  '08': {
    class_sort: '08',
    class_display: 'Class 8',
    iconName: 'Target',
    bgGradient: 'from-[#F3E8FF] to-[#E9D5FF]',
    border: '#D8B4FE',
    textColor: '#581C87',
    badgeBg: '#F3E8FF',
    accent: '#7E22CE',
  },
  '09': {
    class_sort: '09',
    class_display: 'Class 9',
    iconName: 'GraduationCap',
    bgGradient: 'from-[#FCE7F3] to-[#FBCFE8]',
    border: '#F472B6',
    textColor: '#831843',
    badgeBg: '#FCE7F3',
    accent: '#DB2777',
  },
  '10': {
    class_sort: '10',
    class_display: 'Class 10',
    iconName: 'Calculator',
    bgGradient: 'from-[#EEEDFE] to-[#C7D2FE]',
    border: '#A5B4FC',
    textColor: '#1E1B4B',
    badgeBg: '#EEEDFE',
    accent: '#3B4FE0',
  },
  '11': {
    class_sort: '11',
    class_display: 'Class 11',
    iconName: 'Atom',
    bgGradient: 'from-[#F1F5F9] to-[#E2E8F0]',
    border: '#94A3B8',
    textColor: '#0F172A',
    badgeBg: '#F8FAFC',
    accent: '#2563EB',
  },
  '12': {
    class_sort: '12',
    class_display: 'Class 12',
    iconName: 'Award',
    bgGradient: 'from-[#FEF3C7] to-[#FDE68A]',
    border: '#FCD34D',
    textColor: '#78350F',
    badgeBg: '#FEF3C7',
    accent: '#D97706',
  },
};

export function getClassCardStyle(classSort: string): ClassCardStyle {
  const padded = classSort.padStart(2, '0');
  return CLASS_CARD_STYLES[padded] || {
    class_sort: padded,
    class_display: `Class ${parseInt(padded, 10) || 10}`,
    iconName: 'BookOpen',
    bgGradient: 'from-white to-[#F5F6FA]',
    border: '#E3E5EC',
    textColor: '#1E2233',
    badgeBg: '#F5F6FA',
    accent: '#3B4FE0',
  };
}
