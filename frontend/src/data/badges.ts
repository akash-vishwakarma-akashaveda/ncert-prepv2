import type { ElementType } from 'react';
import { Star, Flame, Zap, Trophy, MessageCircleQuestion, BookOpenCheck, Bookmark, Rocket, Sparkles } from 'lucide-react';
import { EducationalStage } from './stageThemes';

export interface BadgeProgress {
  completedCount: number;
  streak: number;
  doubtsAsked: number;
  level: number;
  favorites: number;
}

export interface BadgeDef {
  id: string;
  Icon: ElementType;
  /** Same achievement, different voice per age group — matches the app's existing per-stage copy. */
  name: Record<EducationalStage, string>;
  hint: Record<EducationalStage, string>;
  check: (p: BadgeProgress) => boolean;
}

export const BADGES: BadgeDef[] = [
  {
    id: 'first_lesson',
    Icon: Star,
    name: { primary: 'First Steps', middle: 'First Lesson', senior: 'Ignition' },
    hint: { primary: 'Finish your first lesson', middle: 'Finish any lesson', senior: 'Complete one lesson' },
    check: (p) => p.completedCount >= 1,
  },
  {
    id: 'five_lessons',
    Icon: BookOpenCheck,
    name: { primary: 'Little Learner', middle: 'Steady Climber', senior: 'Momentum' },
    hint: { primary: 'Finish 5 lessons', middle: 'Finish 5 lessons', senior: 'Complete 5 lessons' },
    check: (p) => p.completedCount >= 5,
  },
  {
    id: 'ten_lessons',
    Icon: Rocket,
    name: { primary: 'Super Learner', middle: 'Chapter Crusher', senior: 'Syllabus Slayer' },
    hint: { primary: 'Finish 10 lessons', middle: 'Finish 10 lessons', senior: 'Complete 10 lessons' },
    check: (p) => p.completedCount >= 10,
  },
  {
    id: 'twentyfive_lessons',
    Icon: Trophy,
    name: { primary: 'Star Student', middle: 'Topper in Training', senior: 'Rank Hunter' },
    hint: { primary: 'Finish 25 lessons', middle: 'Finish 25 lessons', senior: 'Complete 25 lessons' },
    check: (p) => p.completedCount >= 25,
  },
  {
    id: 'streak_3',
    Icon: Flame,
    name: { primary: 'Sunshine Streak', middle: 'On a Roll', senior: 'Consistency Lock' },
    hint: { primary: 'Study 3 days in a row', middle: 'Study 3 days in a row', senior: 'Study 3 days in a row' },
    check: (p) => p.streak >= 3,
  },
  {
    id: 'streak_7',
    Icon: Zap,
    name: { primary: 'Week Wonder', middle: 'Week Warrior', senior: 'Iron Will' },
    hint: { primary: 'Study 7 days in a row', middle: 'Study 7 days in a row', senior: 'Study 7 days in a row' },
    check: (p) => p.streak >= 7,
  },
  {
    id: 'first_doubt',
    Icon: MessageCircleQuestion,
    name: { primary: 'Curious Cub', middle: 'Question Master', senior: 'Doubt Destroyer' },
    hint: { primary: 'Ask your first doubt', middle: 'Ask your first doubt', senior: 'Ask your first doubt' },
    check: (p) => p.doubtsAsked >= 1,
  },
  {
    id: 'first_save',
    Icon: Bookmark,
    name: { primary: 'Treasure Keeper', middle: 'Bookmark Boss', senior: 'Archive Builder' },
    hint: { primary: 'Save a lesson', middle: 'Save a lesson', senior: 'Save a lesson' },
    check: (p) => p.favorites >= 1,
  },
  {
    id: 'level_5',
    Icon: Sparkles,
    name: { primary: 'Level 5 Hero', middle: 'Level 5 Scholar', senior: 'Level 5 Strategist' },
    hint: { primary: 'Reach level 5', middle: 'Reach level 5', senior: 'Reach level 5' },
    check: (p) => p.level >= 5,
  },
];
