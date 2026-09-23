import React, { Suspense, lazy } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Bookmark, Play, Pause, RotateCcw, AlertCircle, MessageCircleQuestion, SkipForward, Volume2, VolumeX, PictureInPicture2, CheckCircle2, Zap } from 'lucide-react';
import { Video } from '../../types';
import { useProgress } from '../../context/ProgressContext';
import { useCatalogContext } from '../../context/CatalogContext';
import { MyDoubtsPanel } from '../../components/doubts/MyDoubtsPanel';
import { ReminderSettingsCard } from '../../components/profile/ReminderSettingsCard';
import { ProfileSettings } from '../../components/profile/ProfileSettings';
import { useAuth } from '../../context/AuthContext';
import { useDoubts } from '../../context/DoubtsContext';
import { FocusMode, MIN_XP_FOCUS_SECONDS, PomodoroPreset } from '../useFocusTimer';
import { useStudentContext } from '../StudentLayout';
import { useCourse } from '../useCourse';
import { classLabel } from '../../data/gamification';
import { LogoMark } from '../../components/common/Logo';
import { FOCUS_MODE_STYLE as MODE_STYLE } from '../../components/pomodoro/FloatingPomodoroWidget';
import { tintVars } from '../stage';
import { EmptyState, PageHeader, ProgressBar, SubjectCover, btnPrimary, btnSecondary, card, lessonPath } from '../ui';

export const DoubtsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { videoMap } = useCatalogContext();
  const { myDoubts } = useDoubts();
  const navigate = useNavigate();
  if (isAdmin) {
    return <Navigate to="/app?tab=doubts" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader section="doubts" title="Doubts" description="Questions you asked under lessons. Only you and your educator can see them." />
      {myDoubts.length === 0 ? (
        <EmptyState
          icon={<MessageCircleQuestion className="w-6 h-6" />}
          title="No doubts yet"
          body="Stuck on something? Open any lesson and tap Ask a doubt below the video. Your teacher's reply will show up here."
          action={<Link to="/app/subjects" className={btnPrimary}>Go to my subjects</Link>}
        />
      ) : (
        <MyDoubtsPanel videoMap={videoMap} onSelectVideo={(v) => navigate(lessonPath(v.youtube_id))} standalone />
      )}
    </div>
  );
};

export const SavedPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { favoriteIds, isCompleted, toggleFavorite } = useProgress();
  const { videoMap } = useCatalogContext();
  const classSort = user?.grade_preference;
  const saved = favoriteIds
    .map((id) => videoMap.get(id))
    .filter((v): v is Video => Boolean(v))
    .filter((v) => isAdmin || !classSort || v.class_sort === classSort);

  return (
    <div className="space-y-6">
      <PageHeader section="saved" title="Saved lessons" description="Lessons you bookmarked for quick revision." />
      {saved.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="w-5 h-5" />}
          title="Nothing saved yet"
          body="Use the Save button on any lesson to keep it here."
          action={<Link to="/app/subjects" className={btnPrimary}>Browse subjects</Link>}
        />
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {saved.map((v) => (
            <li key={v.youtube_id} className={`${card} p-4 flex flex-col gap-3 ${v.isActive ? '' : 'opacity-60'}`}>
              <SubjectCover subject={v.subject} size="sm" className="h-[76px] rounded-2xl" />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-extrabold leading-snug line-clamp-2">{v.video_title}</p>
                <p className={`mt-0.5 text-[11.5px] font-bold truncate ${v.isActive ? 'text-[#6B7280]' : 'text-[#E0603F]'}`}>
                  {v.isActive ? `${v.subject} · ${v.chapter_name}` : 'No longer available'}
                  {v.isActive && isCompleted(v.youtube_id) && ' · Completed'}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <button onClick={() => toggleFavorite(v.youtube_id)} className="text-xs font-extrabold text-[#9AA1B4] hover:text-[#E0603F] cursor-pointer">
                  Remove
                </button>
                {v.isActive ? (
                  <Link to={lessonPath(v.youtube_id)} className={`${btnPrimary} px-4 py-2`}>
                    <Play className="w-4 h-4 fill-white" /> Watch
                  </Link>
                ) : (
                  <AlertCircle className="w-5 h-5 text-[#E0603F]" aria-hidden="true" />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const PRESETS: { id: PomodoroPreset; title: string; desc: string }[] = [
  { id: 'sprint', title: 'Sprint', desc: '15 min + 3 min break' },
  { id: 'standard', title: 'Standard', desc: '25 min + 5 min break' },
  { id: 'deep', title: 'Deep work', desc: '50 min + 10 min break' },
];

const mins = (seconds: number) => Math.round(seconds / 60);
const sideCard = `${card} p-5 flex flex-col gap-3.5`;
const sideTitle = 'text-[11px] font-extrabold tracking-[0.08em] text-[#6B7280]';

export const FocusPage: React.FC = () => {
  const { timer } = useStudentContext();
  const { user } = useAuth();

  const r = 110;
  const circumference = 2 * Math.PI * r;
  const progress = timer.total > 0 ? 1 - timer.secondsLeft / timer.total : 0;
  const style = MODE_STYLE[timer.mode];
  const goal = user?.study_goal_minutes || 50;
  const earnsXp = timer.durations.focus >= MIN_XP_FOCUS_SECONDS;
  const status = timer.secondsLeft === 0 ? 'Done!' : timer.running ? `${style.label} running` : 'Paused';

  return (
    <div className="focus-page space-y-6" style={tintVars('focus')}>
      <PageHeader
        section="focus"
        title="Focus timer"
        description="Study in focused blocks with short breaks in between. The timer keeps running while you watch lessons."
        actions={
          <button onClick={timer.toggleFloating} aria-pressed={timer.isFloating} className={`${timer.isFloating ? btnPrimary : btnSecondary} self-start sm:self-auto`}>
            <PictureInPicture2 className="w-4 h-4" />
            {timer.isFloating ? 'Mini timer is on' : 'Show mini timer'}
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)] gap-5 items-start">
        <section aria-label="Timer" className={`${card} p-5 sm:p-8 flex flex-col items-center gap-6`}>
          <label className="w-full max-w-md">
            <span className="sr-only">What are you studying?</span>
            <input
              type="text"
              placeholder="What are you studying? e.g. Chapter 4 notes"
              value={timer.currentTask}
              onChange={(e) => timer.setCurrentTask(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[color:var(--page)] border-2 border-[color:var(--card-line)] text-sm font-bold text-[#1E2233] placeholder:text-[#9AA1B4] focus:bg-white focus:border-[color:var(--brand)] outline-none transition-colors"
            />
          </label>

          <div role="radiogroup" aria-label="Session type" className="w-full sm:w-auto grid grid-cols-3 gap-1 p-1.5 rounded-[18px] bg-[color:var(--page)] border-2 border-[color:var(--card-line)]">
            {(Object.keys(MODE_STYLE) as FocusMode[]).map((id) => {
              const m = MODE_STYLE[id];
              const selected = timer.mode === id;
              return (
                <button
                  key={id}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => timer.selectMode(id)}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-2 rounded-[14px] text-xs sm:text-sm font-extrabold cursor-pointer transition-colors ${
                    selected ? 'bg-white shadow-[0_3px_0_var(--card-line)]' : 'text-[#6B7280] hover:text-[#1E2233]'
                  }`}
                  style={selected ? { color: m.ring } : undefined}
                >
                  <m.Icon className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{m.label}</span>
                  <span className="text-[10.5px] font-bold opacity-70">{mins(timer.durations[id])}m</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-60 h-60 sm:w-72 sm:h-72">
            <svg viewBox="0 0 240 240" className="w-full h-full -rotate-90" aria-hidden="true">
              <circle cx="120" cy="120" r={r} fill="none" style={{ stroke: style.soft }} strokeWidth="16" />
              <circle
                cx="120"
                cy="120"
                r={r}
                fill="none"
                style={{ stroke: style.ring }}
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                className="transition-[stroke-dashoffset] duration-1000 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" aria-live="polite">
              <style.Icon className="w-6 h-6" style={{ color: style.ring }} aria-hidden="true" />
              <span className="font-display text-[52px] sm:text-[64px] leading-none tabular-nums text-[#1E2233]">{timer.label}</span>
              <span className="px-3 py-1 rounded-full text-[11px] font-extrabold" style={{ background: style.soft, color: style.ring }}>
                {status}
              </span>
            </div>
          </div>

          {timer.currentTask && (
            <p className="-mt-2 max-w-md text-center text-sm font-bold text-[#4B5168] truncate">Studying: {timer.currentTask}</p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={timer.toggle} disabled={timer.secondsLeft === 0} className={`${btnPrimary} px-8 py-3 text-base`}>
              {timer.running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
              {timer.running ? 'Pause' : 'Start'}
            </button>
            <button onClick={timer.skipNext} className={btnSecondary} title="Skipped blocks don't earn XP">
              <SkipForward className="w-4 h-4" /> Skip
            </button>
            <button onClick={timer.reset} className={btnSecondary}>
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>

          <p className="text-xs font-bold text-[#6B7280] text-center">
            {earnsXp ? (
              <>
                <Zap className="inline w-3.5 h-3.5 -mt-0.5 text-[#0C8F78] fill-current" /> Finish a focus block to earn +25 XP. Skipped blocks don't count.
              </>
            ) : (
              'Blocks shorter than 15 minutes count as study time but earn no XP.'
            )}
          </p>
        </section>

        <div className="flex flex-col gap-5">
          <section aria-label="Today" className={sideCard}>
            <p className={sideTitle}>TODAY</p>
            <div className="flex items-end justify-between gap-3">
              <p className="font-display text-[28px] leading-none text-[#1E2233]">
                {timer.minutesToday}
                <span className="text-base text-[#6B7280]"> / {goal} min</span>
              </p>
              <p className="text-xs font-extrabold text-[#0C8F78]">
                {timer.sessionsToday} {timer.sessionsToday === 1 ? 'block' : 'blocks'}
              </p>
            </div>
            <ProgressBar value={Math.min(100, (timer.minutesToday / goal) * 100)} color="var(--ring)" />
            <p className="text-xs font-semibold text-[#6B7280]">
              {timer.minutesToday >= goal ? 'Daily goal reached. Great work!' : `${goal - timer.minutesToday} min to reach your daily goal.`}
            </p>
          </section>

          <section aria-label="Cycle" className={sideCard}>
            <div className="flex items-center justify-between">
              <p className={sideTitle}>CYCLE</p>
              <p className="text-xs font-extrabold text-[#6B7280]">Block {timer.cycleStep} of 4</p>
            </div>
            <ol className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((step) => {
                const done = step < timer.cycleStep;
                const current = step === timer.cycleStep;
                return (
                  <li key={step} className="flex flex-col items-center gap-1.5 text-center">
                    <span
                      className={`w-11 h-11 rounded-full border-[3px] flex items-center justify-center text-sm font-extrabold ${
                        done
                          ? 'bg-[#0C8F78] border-[#0B7A67] text-white'
                          : current
                            ? 'bg-white text-[color:var(--ring)] border-[color:var(--ring)]'
                            : 'bg-[#F1F3FB] border-[#E3E5EC] text-[#9AA1B4]'
                      }`}
                      aria-label={`Block ${step}${done ? ', done' : current ? ', current' : ''}`}
                    >
                      {done ? <CheckCircle2 className="w-5 h-5" /> : step}
                    </span>
                    <span className="text-[10.5px] font-bold leading-tight text-[#6B7280]">
                      then {step === 4 ? `${mins(timer.durations.long)}m long break` : `${mins(timer.durations.short)}m break`}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-label="Timer length" className={sideCard}>
            <p className={sideTitle}>TIMER LENGTH</p>
            <div role="radiogroup" aria-label="Timer length" className="flex flex-col gap-2">
              {PRESETS.map((p) => {
                const selected = timer.preset === p.id;
                return (
                  <button
                    key={p.id}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => timer.setPreset(p.id)}
                    className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border-2 text-left cursor-pointer transition-colors ${
                      selected
                        ? 'bg-[color:var(--brand-soft)] border-[color:var(--brand-line)]'
                        : 'bg-white border-[color:var(--card-line)] hover:border-[color:var(--brand-line)]'
                    }`}
                  >
                    <span>
                      <span className={`block text-sm font-extrabold ${selected ? 'text-[color:var(--brand)]' : 'text-[#1E2233]'}`}>{p.title}</span>
                      <span className="block text-[11.5px] font-semibold text-[#6B7280]">{p.desc}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`w-5 h-5 rounded-full border-[3px] shrink-0 ${selected ? 'border-[color:var(--brand)] bg-white shadow-[inset_0_0_0_3px_var(--brand)]' : 'border-[#D7DCEF]'}`}
                    />
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-label="Sound" className={`${card} p-4 flex items-center justify-between gap-3`}>
            <span className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-[13px] bg-[color:var(--ring-soft)] text-[color:var(--ring)] flex items-center justify-center">
                {timer.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </span>
              <span>
                <span className="block text-sm font-extrabold text-[#1E2233]">Chime when a block ends</span>
                <button onClick={() => timer.playChime('focus_end')} className="text-xs font-extrabold text-[color:var(--brand)] hover:underline cursor-pointer">
                  Play a test chime
                </button>
              </span>
            </span>
            <button
              role="switch"
              aria-checked={timer.soundEnabled}
              aria-label="Chime when a block ends"
              onClick={() => timer.setSoundEnabled(!timer.soundEnabled)}
              className={`relative w-12 h-7 shrink-0 rounded-full transition-colors cursor-pointer ${timer.soundEnabled ? 'bg-[color:var(--ring)]' : 'bg-[#D7DCEF]'}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${timer.soundEnabled ? 'left-6' : 'left-1'}`} />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

/** What the reminder email looks like, using the same subject and next lesson that reminderJob sends. */
const ReminderPreview: React.FC = () => {
  const { user } = useAuth();
  const course = useCourse();
  if (!user) return null;
  const next = course.resume;
  const continuing = Boolean(user.last_watched_video && next);

  return (
    <aside aria-label="Email preview" className={sideCard}>
      <p className={sideTitle}>EMAIL PREVIEW</p>
      <div className="rounded-[18px] border-2 border-[color:var(--card-line)] bg-[color:var(--page)] p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <LogoMark className="w-8 h-8" />
          <p className="min-w-0 text-[11.5px] font-semibold leading-tight text-[#6B7280]">
            <span className="block font-extrabold text-[#1E2233]">NCERT Prep</span>
            <span className="block truncate">to {user.email || 'your email'}</span>
          </p>
        </div>
        <p className="font-display text-[17px] leading-snug text-[#1E2233]">
          {continuing && next ? `Time for revision: next up is ${next.chapter_name}` : 'Start your first lesson!'}
        </p>
        {next && (
          <div className="rounded-2xl bg-white border-2 border-[color:var(--card-line)] p-3 flex flex-col gap-1.5">
            <span className="self-start px-2 py-0.5 rounded-md bg-[color:var(--brand)] text-white text-[10.5px] font-extrabold">
              {classLabel(course.classSort)} · {next.subject}
            </span>
            <span className="text-sm font-extrabold text-[#1E2233] leading-snug">{next.chapter_name}</span>
            <span className="text-xs font-semibold text-[#6B7280] line-clamp-2">{next.video_title}</span>
          </div>
        )}
        <span className="self-start px-4 py-2 rounded-xl bg-[#12A594] text-white text-xs font-extrabold">
          {continuing ? 'Watch next lesson' : 'Start your first lesson'} →
        </span>
      </div>
      <ul className="space-y-2 text-xs font-semibold text-[#4B5168]">
        {[
          'Arrives at the hour you pick, in Indian time (IST).',
          'Suggests the next lesson in your class, in chapter order.',
          'Every email has a one-click unsubscribe link.',
        ].map((tip) => (
          <li key={tip} className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#12A594]" aria-hidden="true" /> {tip}
          </li>
        ))}
      </ul>
      {!user.reminders_enabled && (
        <p className="text-xs font-bold text-[#8A5A14] bg-[#FFF6E2] border-2 border-[#FFD97A] rounded-2xl px-3 py-2">
          Reminders are off, so no emails will be sent.
        </p>
      )}
    </aside>
  );
};

export const RemindersPage: React.FC = () => (
  <div className="space-y-6">
    <PageHeader section="reminders" title="Reminders" description="Choose if, how often and when we email you your next lesson." />
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)] gap-5 items-start">
      <ReminderSettingsCard />
      <ReminderPreview />
    </div>
  </div>
);

// Educators get their own account page, loaded only for admins.
const AdminProfile = lazy(() => import('../../pages/admin/AdminProfile').then((m) => ({ default: m.AdminProfile })));

export const ProfilePage: React.FC = () => {
  const { videoMap } = useCatalogContext();
  const { isAdmin } = useAuth();
  if (isAdmin) {
    return (
      <Suspense fallback={<p className="py-12 text-center text-sm font-semibold text-[#6B7280]">Loading…</p>}>
        <AdminProfile />
      </Suspense>
    );
  }
  return (
    <div className="space-y-6">
      <PageHeader section="profile" title="Profile & settings" description="Your account, class, study preferences and data." />
      <ProfileSettings videoMap={videoMap} />
    </div>
  );
};
