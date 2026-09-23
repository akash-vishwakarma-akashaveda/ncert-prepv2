import React, { useState, useEffect } from 'react';
import { ClassGroup, Video, SubjectGroup, NotesTarget } from '../types';
import { NotesService } from '../services/content';
import { Breadcrumbs } from '../components/navigation/Breadcrumbs';
import { ChapterList } from '../components/navigation/ChapterList';
import { ChapterListSkeleton } from '../components/common/SkeletonLoader';
import { getClassCardStyle, getGradeStage, getStageConfig } from '../data/stageThemes';
import { BookOpen, Layers, Lock } from 'lucide-react';
import { StageIcon } from '../components/common/StageIcon';
import { SubjectGrid } from '../components/home/SubjectGrid';
import { useProgress } from '../context/ProgressContext';
import { useAuth } from '../context/AuthContext';

interface BrowsePageProps {
  classes: ClassGroup[];
  selectedClassSort: string;
  selectedSubjectName?: string;
  getSubjectsForClass: (classSort: string) => SubjectGroup[];
  onSelectClass: (classSort: string) => void;
  onSelectVideo: (video: Video) => void;
  onNavigateHome: () => void;
  onOpenNotes?: (target: NotesTarget) => void;
  // Signed-in students see only their enrolled class; visitors can explore all grades.
  lockedToClass?: boolean;
  onChangeClass?: () => void;
}

export const BrowsePage: React.FC<BrowsePageProps> = ({
  classes,
  selectedClassSort,
  selectedSubjectName,
  getSubjectsForClass,
  onSelectClass,
  onSelectVideo,
  onNavigateHome,
  onOpenNotes,
  lockedToClass = false,
  onChangeClass,
}) => {
  const { user, setAuthModalOpen } = useAuth();
  const [currentClassSort, setCurrentClassSort] = useState<string>(selectedClassSort || '10');
  const [subjects, setSubjects] = useState<SubjectGroup[]>([]);
  const [activeSubject, setActiveSubject] = useState<string>('');
  const { isCompleted } = useProgress();
  const [notesKeys, setNotesKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    NotesService.publishedKeysForClass(currentClassSort).then((keys) => {
      if (!cancelled) setNotesKeys(keys);
    });
    return () => {
      cancelled = true;
    };
  }, [currentClassSort]);

  useEffect(() => {
    if (selectedClassSort) {
      setCurrentClassSort(selectedClassSort);
    }
  }, [selectedClassSort]);

  useEffect(() => {
    const subList = getSubjectsForClass(currentClassSort);
    setSubjects(subList);

    // No subject chosen → show the subject grid (SRS §3: class → grid of subjects).
    setActiveSubject(
      selectedSubjectName && subList.some((s) => s.name === selectedSubjectName) ? selectedSubjectName : ''
    );
  }, [currentClassSort, selectedSubjectName, getSubjectsForClass]);

  const currentClassObj = classes.find((c) => c.class_sort === currentClassSort) || classes[0];
  const activeSubjectObj = subjects.find((s) => s.name === activeSubject);
  const currentStage = getGradeStage(currentClassSort);

  // Subject completion statistics
  const activeSubjectStats = React.useMemo(() => {
    if (!activeSubjectObj) return { total: 0, completed: 0, percent: 0 };
    let total = 0;
    let completed = 0;
    activeSubjectObj.chapters.forEach((ch) => {
      ch.videos.forEach((v) => {
        total += 1;
        if (isCompleted(v.youtube_id)) completed += 1;
      });
    });
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [activeSubjectObj, isCompleted]);

  const breadcrumbs = [
    { label: 'Home', onClick: onNavigateHome },
    {
      label: currentClassObj ? currentClassObj.class_display : 'Class',
      active: !activeSubject,
      onClick: () => setActiveSubject(''),
    },
    ...(activeSubject
      ? [
          {
            label: activeSubject,
            active: true,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Breadcrumbs Navigation */}
      <Breadcrumbs items={breadcrumbs} />

      {lockedToClass ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-white border-2 border-[#E3E5EC] rounded-[22px] text-xs">
          <span className="font-bold text-[#6B7280]">
            Showing the syllabus for your class:{' '}
            <span className="font-extrabold text-[#1E2233]">
              {currentClassObj?.class_display || `Class ${parseInt(currentClassSort, 10)}`}
            </span>
          </span>
          {onChangeClass && (
            <button
              onClick={onChangeClass}
              className="font-extrabold text-[#3B4FE0] hover:underline cursor-pointer"
            >
              Change class
            </button>
          )}
        </div>
      ) : (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-extrabold uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#3B4FE0]" />
            <span>Select NCERT Grade (Class 1–12)</span>
          </label>
          <span className="text-[11px] font-bold text-[#3B4FE0] bg-[#3B4FE0]/10 px-2.5 py-0.5 rounded-full">
            {classes.length} Grades Available
          </span>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none py-1">
          {classes.map((cls) => {
            const isSelected = cls.class_sort === currentClassSort;
            const card = getClassCardStyle(cls.class_sort);
            const stageTheme = getStageConfig(cls.class_sort);

            return (
              <button
                key={cls.class_sort}
                onClick={() => {
                  setCurrentClassSort(cls.class_sort);
                  onSelectClass(cls.class_sort);
                }}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-[22px] text-xs font-extrabold transition-all shrink-0 cursor-pointer border ${
                  isSelected
                    ? 'shadow-[0_5px_0_#EDEFF6] scale-[1.03] ring-2 ring-offset-1'
                    : 'bg-white hover:bg-[#F5F6FA] text-[#1E2233] border-[#E3E5EC] hover:border-[#3B4FE0]/30'
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor: card.badgeBg,
                        color: card.textColor,
                        borderColor: card.accent,
                        // @ts-expect-error Tailwind ring offset
                        '--tw-ring-color': card.accent,
                      }
                    : {}
                }
              >
                <div
                  className="w-7 h-7 rounded-[14px] flex items-center justify-center text-xs font-black shadow-[0_4px_0_#EDEFF6]"
                  style={{
                    backgroundColor: isSelected ? card.accent : '#F5F6FA',
                    color: isSelected ? '#FFFFFF' : card.textColor,
                  }}
                >
                  <StageIcon name={card.iconName} className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-xs">{cls.class_display}</p>
                  <p className="text-[10px] opacity-75 font-semibold -mt-0.5">{stageTheme.badge}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {subjects.length === 0 && classes.length > 0 && (
        <div className="bg-white border border-dashed border-[#E3E5EC] rounded-[22px] p-8 text-center text-xs text-[#6B7280]">
          No lessons have been published for this class yet.
        </div>
      )}

      {subjects.length > 0 && !activeSubject && (
        <section aria-labelledby="subject-grid-title" className="space-y-4">
          <div>
            <h2 id="subject-grid-title" className="text-lg sm:text-xl font-black text-[#1E2233] tracking-tight">
              {currentClassObj?.class_display} Subjects
            </h2>
            <p className="text-xs text-[#6B7280]">Tap a subject to open its chapters</p>
          </div>
          <SubjectGrid
            subjects={subjects.map((sub) => ({
              name: sub.name,
              total: sub.videoCount,
              chapterCount: sub.chapters.length,
              completed: sub.chapters.reduce(
                (n, ch) => n + ch.videos.filter((v) => isCompleted(v.youtube_id)).length,
                0
              ),
            }))}
            onSelectSubject={setActiveSubject}
          />
        </section>
      )}

      {/* Modern Subject Selector Deck & Active Subject Banner */}
      {subjects.length > 0 && activeSubject && (
        <div className="bg-white border-2 border-[#E3E5EC] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_0_#EDEFF6] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3E5EC]/70 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[14px] bg-[#3B4FE0]/10 flex items-center justify-center text-[#3B4FE0]">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#1E2233] tracking-tight">
                  {currentClassObj?.class_display} Curriculum
                </h2>
                <p className="text-xs text-[#6B7280]">
                  {currentStage === 'primary' && 'Joyful & foundational revision designed for early learners'}
                  {currentStage === 'middle' && 'Conceptual clarity and board examination question banks'}
                  {currentStage === 'senior' && 'High-yield competitive syllabus and comprehensive NCERT coverage'}
                </p>
              </div>
            </div>

            {/* Subject Progress Pill */}
            {activeSubjectStats.total > 0 && (
              <div className="flex items-center gap-3 bg-[#F5F6FA] px-4 py-2 rounded-[22px] border-2 border-[#E3E5EC] self-start sm:self-auto">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between gap-3 text-xs font-extrabold text-[#1E2233]">
                    <span>{activeSubject} Mastery</span>
                    <span className="text-[#12A594]">{activeSubjectStats.percent}%</span>
                  </div>
                  <div className="w-28 bg-[#E3E5EC] h-1.5 rounded-full overflow-hidden mt-1">
                    <div
                      className="bg-gradient-to-r from-[#3B4FE0] to-[#12A594] h-full rounded-full transition-all duration-500"
                      style={{ width: `${activeSubjectStats.percent}%` }}
                    />
                  </div>
                </div>
                <div className="text-[11px] text-[#6B7280] font-bold border-l border-[#E3E5EC] pl-3">
                  {activeSubjectStats.completed}/{activeSubjectStats.total} done
                </div>
              </div>
            )}
          </div>

          {/* Subject Pills */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setActiveSubject('')}
              className="px-4 py-2.5 rounded-[22px] text-xs font-extrabold border border-dashed border-[#CBD5E1] text-[#6B7280] hover:text-[#1E2233] hover:bg-[#F5F6FA] cursor-pointer"
            >
              All subjects
            </button>
            {subjects.map((sub) => {
              const isCurrent = sub.name === activeSubject;
              return (
                <button
                  key={sub.name}
                  onClick={() => setActiveSubject(sub.name)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-[22px] text-xs font-extrabold transition-all cursor-pointer border ${
                    isCurrent
                      ? 'bg-gradient-to-r from-[#3B4FE0] to-[#2F40BD] text-white border-[#3B4FE0] shadow-[0_5px_0_#EDEFF6] scale-[1.02]'
                      : 'bg-[#F8F9FD] text-[#1E2233] border-[#E3E5EC] hover:bg-white hover:border-[#3B4FE0]/30 hover:shadow-[0_4px_0_#EDEFF6]'
                  }`}
                >
                  <span>{sub.name}</span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isCurrent ? 'bg-white/20 text-white' : 'bg-[#E3E5EC] text-[#6B7280]'
                    }`}
                  >
                    {sub.videoCount} {sub.videoCount === 1 ? 'lesson' : 'lessons'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chapters & Video List */}
      {((subjects.length > 0 && activeSubject) || classes.length === 0) && (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-[#1E2233] tracking-tight">
              {activeSubject} Chapters
            </h3>
            <p className="text-xs text-[#6B7280]">
              Click any lesson to watch distraction-free on YouTube No-Cookie embed
            </p>
          </div>
        </div>

        {/* Free Preview Notice for Unauthenticated Visitors */}
        {!user && activeSubjectObj && (
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-teal-50 border border-[#C7CDF8]/80 rounded-[22px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_4px_0_#EDEFF6]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-[#3B4FE0] text-white flex items-center justify-center shrink-0 shadow-[0_4px_0_#EDEFF6]">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-[#1E2233] flex items-center gap-2">
                  <span>Free Preview Mode · Chapter 1 Unlocked</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#12A594] text-white">Sample</span>
                </p>
                <p className="text-xs text-[#6B7280]">
                  Watch Chapter 1 as a free sample. Sign in or register for free to unlock all {activeSubjectObj.chapters.length} chapters, formula cheat sheets, and progress saving.
                </p>
              </div>
            </div>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-4 py-2 text-xs font-extrabold text-white btn-3d [--edge:#2A3BB8] bg-[#3B4FE0] hover:bg-[#3446D6] rounded-[14px] shadow-[0_4px_0_#EDEFF6] transition-all shrink-0 cursor-pointer self-start sm:self-auto hover:scale-105"
            >
              Sign in to unlock all
            </button>
          </div>
        )}

        {activeSubjectObj ? (
          <ChapterList
            chapters={activeSubjectObj.chapters}
            onSelectVideo={onSelectVideo}
            onOpenNotes={onOpenNotes}
            notesKeys={notesKeys}
          />
        ) : (
          <ChapterListSkeleton />
        )}
      </div>
      )}
    </div>
  );
};
