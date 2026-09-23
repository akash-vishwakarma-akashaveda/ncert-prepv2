import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Play,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Megaphone,
  AlertTriangle,
  ArrowRight,
  Pin,
  Star,
  Flame,
  Trophy,
  Zap,
  MessageCircleQuestion,
  BookOpenCheck,
  Heart,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProgress } from '../../context/ProgressContext';
import { useDoubts } from '../../context/DoubtsContext';
import { useCatalogContext } from '../../context/CatalogContext';
import { useDashboardConfig } from '../../hooks/useDashboardConfig';
import { DashboardAnnouncement } from '../../services/dashboardControl';
import { LeaderboardService } from '../../services/leaderboard';
import { LeaderboardEntry } from '../../types';
import { classLabel, currentStreak, streakWeek, xpStats } from '../../data/gamification';
import { getSubjectTileStyle } from '../../data/colorTokens';
import { useCourse } from '../useCourse';
import { KidsScene, tintVars, useStage } from '../stage';
import { SubjectCard } from './SubjectsPage';
import { EmptyState, RankBadge, SubjectGlyph, btnAccent, btnPrimary, card, formatDuration, lessonPath, linkText, subjectPath } from '../ui';
import { UserAvatar } from '../../data/avatars';

const TONES: Record<DashboardAnnouncement['tone'], { box: string; icon: string; tag: string; label: string; Icon: React.ElementType }> = {
  exam: { box: 'bg-[#1E2233] border-[#2C3350] text-white', icon: 'bg-[#FFC53D] text-[#1E2233]', tag: 'text-[#FFD97A]', label: 'EXAM NOTICE', Icon: Sparkles },
  warning: { box: 'bg-[#FFF1D6] border-[#FFD97A] text-[#1E2233]', icon: 'bg-[#FFC53D] text-[#1E2233]', tag: 'text-[#8A5A14]', label: 'IMPORTANT', Icon: AlertTriangle },
  success: { box: 'bg-[#E7F7F1] border-[#A9E6D3] text-[#1E2233]', icon: 'bg-[#12A594] text-white', tag: 'text-[#0B7A67]', label: 'GOOD NEWS', Icon: CheckCircle2 },
  info: { box: 'bg-[color:var(--brand-soft)] border-[color:var(--brand-line)] text-[#1E2233]', icon: 'bg-[color:var(--brand)] text-white', tag: 'text-[color:var(--brand)]', label: 'FROM YOUR TEACHER', Icon: Megaphone },
};

const StatTile: React.FC<{ value: React.ReactNode; label: string; color: string; soft: string; Icon: React.ElementType }> = ({
  value,
  label,
  color,
  soft,
  Icon,
}) => (
  <div className={`${card} stat-tile p-4 flex flex-col gap-2.5`} style={{ ['--tint' as string]: color, ['--tint-soft' as string]: soft }}>
    <span className="stat-icon w-10 h-10 rounded-[13px] flex items-center justify-center" aria-hidden="true">
      <Icon className="w-5 h-5" strokeWidth={2.4} />
    </span>
    <span className="flex flex-col gap-1">
      <span className="font-display text-[26px] leading-none" style={{ color }}>
        {value}
      </span>
      <span className="text-[11px] font-extrabold text-[#6B7280]">{label}</span>
    </span>
  </div>
);

// Admin console is its own chunk, so students never download it.
const AdminDashboard = lazy(() => import('../../pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));

export const HomePage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { isCompleted, favoriteIds, totalXp } = useProgress();
  const { myDoubts } = useDoubts();
  const course = useCourse();
  const { allVideos, records, refreshCatalog } = useCatalogContext();
  const { config } = useDashboardConfig();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const stage = useStage();
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);

  // Hooks stay above the early returns below so every render calls them in the same order.
  useEffect(() => {
    if (!user || isAdmin || !course.classSort) return;
    let active = true;
    const load = () =>
      LeaderboardService.getClassLeaderboard(course.classSort, user, course.completedCount, totalXp).then((list) => {
        if (active) setLeaderboardEntries(list);
      });
    load();
    window.addEventListener('quickprep-leaderboard-change', load);
    window.addEventListener('storage', load);
    return () => {
      active = false;
      window.removeEventListener('quickprep-leaderboard-change', load);
      window.removeEventListener('storage', load);
    };
  }, [course.classSort, user, isAdmin, course.completedCount, totalXp]);

  if (!user) return null;

  // Admins (users.role === 'admin', set only in the Firebase console) get the admin console here.
  if (isAdmin) {
    return (
      <Suspense fallback={<p className="py-12 text-center text-sm font-semibold text-[#6B7280]">Loading admin console…</p>}>
      <AdminDashboard
        allVideos={allVideos}
        records={records}
        onRefreshCatalog={refreshCatalog}
        onBackToApp={() => navigate('/browse')}
        onSelectVideo={(v) => navigate(`/app/lesson/${encodeURIComponent(v.youtube_id)}`)}
        currentSection={(searchParams.get('tab') as any) || 'overview'}
        onSectionChange={(nextSection, options) => {
          const nextParams: Record<string, string> = { tab: nextSection };
          if (options?.notesKey) nextParams.notesKey = options.notesKey;
          if (options?.doubtId) nextParams.doubtId = options.doubtId;
          setSearchParams(nextParams);
        }}
        initialNavOptions={{
          notesKey: searchParams.get('notesKey') || undefined,
          doubtId: searchParams.get('doubtId') || undefined,
        }}
        hideSidebar={true}
      />
      </Suspense>
    );
  }

  if (!course.classSort) {
    return (
      <EmptyState
        icon={<GraduationCap className="w-6 h-6" />}
        title="Choose your class to get started"
        body="Finish the setup to see your subjects."
      />
    );
  }

  const firstName = user.displayName?.split(' ')[0] || 'there';
  const streak = currentStreak(user);
  const week = streakWeek(user);
  const { level, xp } = xpStats(course.completedCount);
  const resume = course.resume;
  const resumeSubject = resume ? course.subjects.find((s) => s.group.name === resume.subject) : undefined;
  const upNext = course.subjects
    .flatMap((s) => s.lessons.filter((v) => !isCompleted(v.youtube_id)).slice(0, 2))
    .filter((v) => v.youtube_id !== resume?.youtube_id)
    .slice(0, 4);

  const classInt = parseInt(course.classSort.replace(/\D/g, ''), 10);

  const myRankIndex = leaderboardEntries.findIndex((e) => e.userId === user?.userId);
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;
  const ann = config?.announcement;
  const showAnn = Boolean(
    ann?.isActive &&
      (ann.targetClass === 'all' || ann.targetClass === course.classSort || parseInt(ann.targetClass.replace(/\D/g, ''), 10) === classInt)
  );
  const spotlight = config?.spotlights?.[course.classSort] || config?.spotlights?.[String(classInt)];
  const tone = ann ? TONES[ann.tone] || TONES.info : TONES.info;
  const kids = stage === 'primary';

  // Badges come from real progress only, so a new account starts with none.
  const badges = [
    { name: 'First lesson', Icon: Star, got: course.completedCount >= 1, hint: 'Finish any lesson' },
    { name: '3-day streak', Icon: Flame, got: streak >= 3, hint: 'Study 3 days in a row' },
    { name: 'Curious mind', Icon: MessageCircleQuestion, got: myDoubts.length > 0, hint: 'Ask your first doubt' },
    { name: '10 lessons', Icon: BookOpenCheck, got: course.completedCount >= 10, hint: 'Finish 10 lessons' },
    { name: '7-day streak', Icon: Zap, got: streak >= 7, hint: 'Study 7 days in a row' },
    { name: 'Level 5', Icon: Trophy, got: level >= 5, hint: 'Reach level 5' },
  ];
  const nextBadge = badges.find((b) => !b.got);

  return (
    <div className="space-y-6">
      {showAnn && ann && (
        <section aria-label="Announcement" className={`ann-${ann.tone} rounded-[24px] border-[3px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${tone.box}`}>
          <span className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 ${tone.icon}`}>
            <tone.Icon className="w-5 h-5" strokeWidth={2.4} />
          </span>
          <div className="flex-1 min-w-0">
            <p className={`ann-tag text-[10.5px] font-extrabold tracking-[0.1em] ${tone.tag}`}>{tone.label}</p>
            <h2 className="text-lg leading-snug">{ann.title}</h2>
            <p className="text-sm font-semibold opacity-80">{ann.message}</p>
          </div>
          {ann.actionLabel && ann.actionUrl && (
            <Link to={ann.actionUrl} className={`${btnAccent} shrink-0`}>
              {ann.actionLabel} <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] gap-5">
        <section
          className={`relative overflow-hidden rounded-[28px] p-6 sm:p-7 flex flex-col gap-3.5 ${
            kids ? 'hero-kids text-[#1E2233] pb-20 sm:pr-40' : 'text-white bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-to)]'
          }`}
        >
          {kids ? (
            <KidsScene />
          ) : (
            <>
              <span aria-hidden="true" className="hero-doodles opacity-90" />
              <span aria-hidden="true" className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/10" />
            </>
          )}
          <p className={`relative text-[11px] font-extrabold tracking-[0.1em] ${kids ? 'text-[#1E6FB0]' : 'opacity-80'}`}>
            {classLabel(course.classSort).toUpperCase()}
            {resume && ` · ${resume.subject.toUpperCase()}`}
          </p>
          <h1 className={`relative leading-[1.15] max-w-[480px] ${kids ? 'text-[28px] sm:text-[34px]' : 'text-[26px] sm:text-[30px]'}`}>
            {course.completedCount ? `Welcome back, ${firstName}!` : `Hi ${firstName}, let's begin!`}
            {resume && <> Ready for {resume.chapter_name}?</>}
          </h1>
          <p className={`relative text-[13.5px] font-semibold leading-relaxed max-w-[440px] ${kids ? 'text-[#3A4260]' : 'opacity-90'}`}>
            {resumeSubject
              ? `You finished ${resumeSubject.completed} of ${resumeSubject.lessons.length} lessons in ${resumeSubject.group.name}. One lesson today earns you 50 XP${streak ? ' and keeps your streak alive' : ''}.`
              : 'Pick a subject below to start your first lesson.'}
          </p>
          {resume && (
            <div className="relative flex flex-wrap gap-3 mt-1">
              <Link to={lessonPath(resume.youtube_id)} className={`${btnAccent} animate-glow`}>
                <Play className="w-4 h-4 fill-current" /> {course.resumeStarted ? 'Jump back in' : 'Start lesson'}
              </Link>
              <Link
                to={subjectPath(resume.subject)}
                className={`inline-flex items-center px-5 py-2.5 rounded-2xl text-sm font-extrabold ${
                  kids ? 'bg-white border-[3px] border-[#A6D6F7] text-[#1E6FB0] hover:bg-[#F3FAFF]' : 'bg-white/15 border-2 border-white/40 hover:bg-white/25'
                }`}
              >
                See my learning path
              </Link>
            </div>
          )}
        </section>

        <div className="grid grid-cols-2 gap-3.5">
          <StatTile value={course.completedCount} label="LESSONS DONE" color="#0C8F78" soft="#DDF5EE" Icon={BookOpenCheck} />
          <StatTile value={streak} label="DAY STREAK" color="#E0603F" soft="#FFE8E0" Icon={Flame} />
          <StatTile value={favoriteIds.length} label="SAVED" color="#C9447F" soft="#FDE6F0" Icon={Heart} />
          <Link to="/app/leaderboard" className="block text-left transition-transform hover:scale-[1.02]" title="View Class Leaderboard">
            <StatTile
              value={
                <span className="flex items-center justify-between gap-1">
                  <span>{totalXp || xp}</span>
                  {myRank && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-[#FFF0CF] text-[#B87A06] border border-[#FFD97A]">
                      #{myRank}
                    </span>
                  )}
                </span>
              }
              label="TOTAL XP · RANK"
              color="#B87A06"
              soft="#FFF0CF"
              Icon={Trophy}
            />
          </Link>
        </div>
      </div>

      {spotlight?.isActive && (
        <section aria-labelledby="spotlight-title" className="rounded-[24px] bg-[#FFF6E2] border-[3px] border-[#FFD97A] shadow-[0_5px_0_#FFD97A] p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <SubjectGlyph subject={spotlight.subject} className="w-14 h-14" />
          <div className="flex-1 min-w-0">
            <p className="text-[10.5px] font-extrabold tracking-[0.1em] text-[#8A5A14]">TEACHER'S SPOTLIGHT · {spotlight.subject.toUpperCase()}</p>
            <h2 id="spotlight-title" className="text-lg leading-snug">
              {spotlight.title}
              {isCompleted(spotlight.videoId) && <CheckCircle2 className="inline w-4 h-4 ml-1.5 text-[#12A594]" aria-label="Completed" />}
            </h2>
            {spotlight.note && (
              <p className="mt-1 text-sm font-semibold text-[#8A5A14] flex items-start gap-1.5">
                <Pin className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {spotlight.note}
              </p>
            )}
          </div>
          <Link to={lessonPath(spotlight.videoId)} className={`${btnPrimary} shrink-0`}>
            <Play className="w-4 h-4 fill-white" /> Watch
          </Link>
        </section>
      )}

      {course.allLessons.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-6 h-6" />}
          title={`Lessons for ${classLabel(course.classSort)} are coming soon`}
          body="If you picked the wrong class, change it in Profile & settings."
          action={<Link to="/app/profile" className={btnPrimary}>Review my class</Link>}
        />
      ) : (
        <>
          <section aria-labelledby="subjects-title" className="space-y-4">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h2 id="subjects-title" className="text-[21px]">Your subjects</h2>
              <span className="text-[12.5px] font-bold text-[#6B7280]">
                {classLabel(course.classSort)} ·{' '}
                <Link to="/app/profile" className="text-[color:var(--brand)] hover:text-[color:var(--brand-edge)]">
                  Change class
                </Link>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
              {course.subjects.slice(0, 8).map((s) => (
                <SubjectCard key={s.group.name} summary={s} />
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5">
            <section aria-labelledby="upnext-title" className={`${card} p-5 flex flex-col gap-3`}>
              <h3 id="upnext-title" className="text-lg">Up next for you</h3>
              {upNext.length === 0 && <p className="text-sm font-semibold text-[#6B7280]">You've finished everything published so far. Brilliant!</p>}
              {upNext.map((v) => {
                const t = getSubjectTileStyle(v.subject);
                return (
                  <Link
                    key={v.youtube_id}
                    to={lessonPath(v.youtube_id)}
                    className="flex items-center gap-3 p-2.5 rounded-[18px] border-2 border-[color:var(--card-line)] hover:bg-[#F7F8FC] hover:border-[#D7DCEF]"
                  >
                    <span className="w-11 h-11 shrink-0 rounded-[14px] flex items-center justify-center" style={{ background: t.bg, color: t.ink }}>
                      <Play className="w-4 h-4 fill-current" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13.5px] font-extrabold truncate">{v.video_title}</span>
                      <span className="block text-[11.5px] font-semibold text-[#6B7280] truncate">
                        {v.subject} · {v.chapter_name}
                        {formatDuration(v.duration_seconds) && ` · ${formatDuration(v.duration_seconds)}`}
                      </span>
                    </span>
                    <span className="text-[11px] font-extrabold text-[#12A594] shrink-0">+50 XP</span>
                  </Link>
                );
              })}
            </section>

            <section aria-labelledby="badges-title" className="rounded-[24px] bg-[#FFF6E2] border-[3px] border-[#FFD97A] p-5 flex flex-col gap-3.5">
              <div className="flex items-center justify-between gap-3">
                <h3 id="badges-title" className="text-lg">Badges</h3>
                <ol className="flex gap-1" aria-label="Last 7 days">
                  {week.map((d) => (
                    <li
                      key={d.key}
                      title={d.key}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                        d.active ? 'bg-[#FF7A59] text-white' : d.isToday ? 'border-2 border-[#E0A81F] text-[#8A5A14]' : 'bg-[#FFE7B5] text-[#C9A55A]'
                      }`}
                    >
                      {d.label}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {badges.map((b) => (
                  <div
                    key={b.name}
                    title={b.got ? b.name : b.hint}
                    className={`aspect-square rounded-[20px] border-[3px] flex flex-col items-center justify-center gap-1 p-1 ${
                      b.got ? 'bg-white border-[#FFC53D]' : 'bg-[#FFF0D8] border-[#E6D3AE] opacity-45'
                    }`}
                  >
                    <b.Icon className={`w-5 h-5 ${b.got ? 'text-[#E0A81F]' : 'text-[#C9A55A]'}`} strokeWidth={2.4} />
                    <span className="text-[9px] sm:text-[10px] font-extrabold text-[#6B7280] text-center leading-tight">{b.name}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11.5px] font-bold text-[#8A5A14]">
                {nextBadge ? `${nextBadge.hint} to unlock "${nextBadge.name}".` : 'You unlocked every badge. Superstar!'}
              </p>
            </section>
          </div>

          {/* Class Leaderboard Preview Card */}
          <section aria-labelledby="home-leaderboard-title" className={`${card} p-5 sm:p-6 flex flex-col gap-4`}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="stat-icon w-10 h-10 rounded-[14px] flex items-center justify-center" style={tintVars('leaderboard')}>
                  <Trophy className="w-5 h-5" />
                </span>
                <div>
                  <h3 id="home-leaderboard-title" className="text-lg font-display text-[#1E2233]">
                    {classLabel(course.classSort)} Leaderboard
                  </h3>
                  <p className="text-xs font-semibold text-[#6B7280]">
                    {myRank
                      ? `You are ranked #${myRank} of ${leaderboardEntries.length} classmates in ${classLabel(course.classSort)}`
                      : `Compete with fellow ${classLabel(course.classSort)} students based on XP earned`}
                  </p>
                </div>
              </div>
              <Link
                to="/app/leaderboard"
                className={`${linkText} flex items-center gap-1`}
              >
                See all rankings <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {leaderboardEntries.slice(0, 3).map((entry, idx) => {
                const isYou = entry.userId === user.userId;
                return (
                  <div
                    key={entry.userId}
                    className={`rounded-2xl p-3.5 border-2 flex items-center gap-3 transition-colors ${
                      isYou
                        ? 'bg-[color:var(--brand-soft)] border-[color:var(--brand-line)]'
                        : 'bg-[color:var(--page)] border-[color:var(--card-line)]'
                    }`}
                  >
                    <RankBadge rank={idx + 1} />
                    <UserAvatar
                      photoURL={entry.photoURL || entry.avatarSeed}
                      displayName={entry.displayName}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold truncate text-[#1E2233] flex items-center gap-1">
                        <span>{entry.displayName}</span>
                        {isYou && <span className="text-[10px] text-[color:var(--brand)] font-black">(You)</span>}
                      </p>
                      <p className="text-[11px] font-semibold text-[#6B7280]">
                        Lv {entry.level} · {entry.completedCount} lessons
                      </p>
                    </div>
                    <span className="text-xs font-black text-[#B87A06] bg-[#FFF0CF] px-2 py-0.5 rounded-lg border border-[#FFD97A] shrink-0">
                      {entry.xp} XP
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
