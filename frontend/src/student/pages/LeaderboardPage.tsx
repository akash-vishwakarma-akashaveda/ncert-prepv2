import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Flame,
  Star,
  Sparkles,
  BookOpenCheck,
  Crown,
  TrendingUp,
  ArrowRight,
  GraduationCap,
  Zap,
  Timer,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProgress } from '../../context/ProgressContext';
import { LeaderboardService } from '../../services/leaderboard';
import { LeaderboardEntry } from '../../types';
import { classLabel, XP_PER_COMPLETED_LESSON } from '../../data/gamification';
import { normalizeClassSort } from '../../data/classFormat';
import { EmptyState, PageHeader, RankBadge, btnAccent, btnPrimary, card, linkText } from '../ui';
import { UserAvatar } from '../../data/avatars';
import { useStage } from '../stage';

const AVAILABLE_CLASSES = Array.from({ length: 12 }, (_, i) => ({ id: String(i + 1).padStart(2, '0'), label: `Class ${i + 1}` }));

export const LeaderboardPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { completedCount, totalXp } = useProgress();
  const kids = useStage() === 'primary';

  const userClassSort = normalizeClassSort(user?.grade_preference || '10');
  // For students, selectedClass is strictly locked to their own class.
  // Admins can switch classes to inspect any class.
  const [selectedClass, setSelectedClass] = useState<string>(userClassSort);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync selectedClass when user's grade preference loads
  useEffect(() => {
    if (user?.grade_preference && !isAdmin) {
      setSelectedClass(normalizeClassSort(user.grade_preference));
    }
  }, [user?.grade_preference, isAdmin]);

  // Load leaderboard entries
  useEffect(() => {
    let active = true;
    const fetchEntries = async () => {
      setLoading(true);
      try {
        const list = await LeaderboardService.getClassLeaderboard(selectedClass, user);
        if (active) {
          setEntries(list);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
        if (active) setLoading(false);
      }
    };

    fetchEntries();

    const onUpdate = () => {
      fetchEntries();
    };

    window.addEventListener('quickprep-leaderboard-change', onUpdate);
    window.addEventListener('storage', onUpdate);

    return () => {
      active = false;
      window.removeEventListener('quickprep-leaderboard-change', onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
  }, [selectedClass, user, completedCount, totalXp]);

  // Calculations for current user
  const userRankIndex = entries.findIndex((e) => e.userId === user?.userId);
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : null;
  const userEntry = userRankIndex >= 0 ? entries[userRankIndex] : null;

  // Person directly ahead of current user
  const aheadEntry = userRankIndex > 0 ? entries[userRankIndex - 1] : null;
  const xpDifferenceToNext = aheadEntry && userEntry ? Math.max(0, aheadEntry.xp - userEntry.xp + 1) : 0;
  const lessonsNeededToPass = Math.ceil(xpDifferenceToNext / XP_PER_COMPLETED_LESSON);

  // Podium (top 3)
  const top1 = entries[0] || null;
  const top2 = entries[1] || null;
  const top3 = entries[2] || null;

  const isCurrentClass = selectedClass === userClassSort;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        section="leaderboard"
        title="Class Leaderboard"
        description={`Compare XP earned through lessons and streaks with students in ${classLabel(selectedClass)}.`}
      />

      {/* Class isolation banner for regular students, or class switcher for admins */}
      {isAdmin ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
          <span className="text-xs font-bold text-[#6B7280] mr-1 shrink-0">Admin inspector:</span>
          {AVAILABLE_CLASSES.map((cls) => {
            const active = selectedClass === cls.id;
            return (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-extrabold border-[2.5px] transition-all cursor-pointer ${
                  active
                    ? 'bg-[#FFC53D] text-[#1E2233] border-[#E0A81F] shadow-[0_3px_0_#E0A81F]'
                    : 'bg-white text-[#4B5168] border-[color:var(--card-line)] hover:border-[color:var(--brand-line)]'
                }`}
              >
                <span>{cls.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border-2 border-[color:var(--card-line)] text-xs sm:text-sm font-bold text-[#4B5168]">
          <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-[#12A594]" aria-hidden="true" />
          <span>
            Only students in <strong className="text-[#1E2233]">{classLabel(userClassSort)}</strong> appear here.{' '}
            <Link to="/app/profile" className={linkText}>
              Change class
            </Link>
          </span>
        </p>
      )}

      {/* User Standing Hero Card (when viewing student's own class) */}
      {isCurrentClass && (
        <section
          aria-label="Your Rank and Stats"
          className={`relative overflow-hidden rounded-[26px] p-5 sm:p-6 ${
            kids
              ? 'bg-gradient-to-br from-[#FFE9A8] to-[#FFC53D] border-[3px] border-[#E0A81F] shadow-[0_6px_0_#E0A81F] text-[#1E2233]'
              : 'bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-to)] text-white'
          }`}
        >
          {kids && <Trophy aria-hidden="true" className="absolute -right-6 -bottom-8 w-44 h-44 text-white/35 rotate-12" />}
          <span aria-hidden="true" className="hero-doodles opacity-90" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <UserAvatar
                  photoURL={user?.photoURL || userEntry?.photoURL}
                  displayName={user?.displayName}
                  size="xl"
                  className={kids ? 'ring-4 ring-white' : 'ring-4 ring-white/60'}
                />
                <span className="absolute -bottom-2 -right-1 px-2 py-0.5 rounded-full bg-[#FFC53D] text-[#1E2233] font-display text-xs border-2 border-white shadow">
                  {userRank ? `#${userRank}` : '—'}
                </span>
                {userRank === 1 && (
                  <Crown className="absolute -top-3 -right-2 w-6 h-6 text-[#FFD700] fill-[#FFD700] drop-shadow" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] font-black tracking-wider uppercase ${kids ? 'text-[#8A5A14]' : 'text-[#FFD97A]'}`}>
                    Your {classLabel(selectedClass)} Standing
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${kids ? 'bg-white/70 text-[#8A5A14]' : 'bg-white/15 text-white'}`}>
                    {entries.length} {entries.length === 1 ? 'student' : 'students'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-display mt-0.5 truncate">
                  {user?.displayName || 'Student'}
                </h2>
                <p className={`text-xs sm:text-sm font-semibold mt-0.5 ${kids ? 'text-[#5C3D05]' : 'text-white/90'}`}>
                  {userRank === 1 ? (
                    <span className="flex items-center gap-1.5 font-bold">
                      <Crown className="w-4 h-4 text-[#FFD700] fill-[#FFD700]" />
                      You are in 1st place! Keep studying to defend your crown!
                    </span>
                  ) : aheadEntry ? (
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <TrendingUp className={`w-4 h-4 ${kids ? 'text-[#9A3412]' : 'text-[#FFD97A]'}`} />
                      <span>
                        Need <strong className={kids ? 'text-[#9A3412]' : 'text-[#FFD97A]'}>{xpDifferenceToNext} more XP</strong> ({lessonsNeededToPass} lesson
                        {lessonsNeededToPass > 1 ? 's' : ''}) to pass #{userRankIndex} {aheadEntry.displayName}!
                      </span>
                    </span>
                  ) : (
                    <span>Complete your first lesson to join the class leaderboard!</span>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Stat Badges */}
            <div className="relative grid grid-cols-4 gap-2 sm:gap-3 md:flex md:items-center">
              <div className="bg-white rounded-2xl px-2 sm:px-3.5 py-2 flex flex-col items-center shadow-[0_3px_0_rgba(30,34,51,0.12)] min-w-0 md:min-w-[80px]">
                <span className="text-[10px] font-extrabold text-[#6B7280] whitespace-nowrap">TOTAL XP</span>
                <span className="font-display text-lg sm:text-xl text-[#B87A06]">{userEntry?.xp ?? 0}</span>
              </div>
              <div className="bg-white rounded-2xl px-2 sm:px-3.5 py-2 flex flex-col items-center shadow-[0_3px_0_rgba(30,34,51,0.12)] min-w-0 md:min-w-[80px]">
                <span className="text-[10px] font-extrabold text-[#6B7280] whitespace-nowrap">LEVEL</span>
                <span className="font-display text-lg sm:text-xl text-[color:var(--brand)]">Lv {userEntry?.level ?? 1}</span>
              </div>
              <div className="bg-white rounded-2xl px-2 sm:px-3.5 py-2 flex flex-col items-center shadow-[0_3px_0_rgba(30,34,51,0.12)] min-w-0 md:min-w-[80px]">
                <span className="text-[10px] font-extrabold text-[#6B7280] whitespace-nowrap">LESSONS</span>
                <span className="font-display text-lg sm:text-xl text-[#0C8F78]">{userEntry?.completedCount ?? 0}</span>
              </div>
              <div className="bg-white rounded-2xl px-2 sm:px-3.5 py-2 flex flex-col items-center shadow-[0_3px_0_rgba(30,34,51,0.12)] min-w-0 md:min-w-[80px]">
                <span className="text-[10px] font-extrabold text-[#6B7280] whitespace-nowrap">STREAK</span>
                <span className="font-display text-lg sm:text-xl text-[#E0603F] flex items-center gap-0.5">
                  <Flame className="w-4 h-4 fill-current" /> {userEntry?.streak_days ?? 0}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Top 3 Podium (Visual Showcase) */}
      {entries.length >= 3 && (
        <section aria-label="Top 3 Students Podium" className={`${card} p-5 sm:p-7 overflow-hidden`}>
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-[#8A5A14] bg-[#FFF1D6] border-2 border-[#FFD97A] px-3 py-1 rounded-full uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Top Performers · {classLabel(selectedClass)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-2xl mx-auto pt-4">
            {/* Rank 2 (Silver) */}
            {top2 && (
              <div className="flex flex-col items-center order-1 text-center">
                <div className="relative mb-2">
                  <UserAvatar
                    photoURL={top2.photoURL || top2.avatarSeed}
                    displayName={top2.displayName}
                    size="xl"
                    className="shadow-md ring-2 ring-[#CBD5E1]"
                  />
                  <span className="absolute -bottom-2 inset-x-0 mx-auto w-6 h-6 rounded-full bg-[#94A3B8] border-2 border-white text-white font-black text-xs flex items-center justify-center shadow">
                    2
                  </span>
                </div>
                <p className="font-display text-xs sm:text-sm text-[#1E2233] mt-2 line-clamp-1">
                  {top2.displayName}
                  {top2.userId === user?.userId && <span className="block text-[10px] text-[#12A594] font-extrabold">(You)</span>}
                </p>
                <span className="text-[11px] sm:text-xs font-black text-[#64748B] mt-0.5">{top2.xp} XP</span>
                <span className="text-[10px] font-bold text-[#94A3B8]">Lv {top2.level}</span>

                {/* Pedestal 2 */}
                <div className="w-full h-24 sm:h-28 mt-3 rounded-t-2xl bg-gradient-to-b from-[#E2E8F0] to-[#CBD5E1] border-2 border-[#94A3B8] flex items-center justify-center shadow-inner">
                  <span className="font-display text-2xl sm:text-3xl text-[#64748B]">2nd</span>
                </div>
              </div>
            )}

            {/* Rank 1 (Gold) */}
            {top1 && (
              <div className="flex flex-col items-center order-2 text-center -translate-y-2">
                <Crown className="w-8 h-8 text-[#E0A81F] fill-[#FFC53D] animate-bob mb-1" />
                <div className="relative mb-2">
                  <UserAvatar
                    photoURL={top1.photoURL || top1.avatarSeed}
                    displayName={top1.displayName}
                    size="xl"
                    className="w-20 h-20 sm:w-22 sm:h-22 shadow-lg ring-4 ring-[#FFF0CF]"
                  />
                  <span className="absolute -bottom-2 inset-x-0 mx-auto w-7 h-7 rounded-full bg-[#FFC53D] border-2 border-white text-[#1E2233] font-black text-xs sm:text-sm flex items-center justify-center shadow">
                    1
                  </span>
                </div>
                <p className="font-display text-sm sm:text-base text-[#1E2233] mt-2 line-clamp-1 font-bold">
                  {top1.displayName}
                  {top1.userId === user?.userId && <span className="block text-[10px] text-[#12A594] font-extrabold">(You)</span>}
                </p>
                <span className="text-xs sm:text-sm font-black text-[#B87A06] mt-0.5">{top1.xp} XP</span>
                <span className="text-[10px] font-extrabold text-[#B87A06]">Lv {top1.level} · {top1.completedCount} lessons</span>

                {/* Pedestal 1 */}
                <div className="w-full h-32 sm:h-36 mt-3 rounded-t-2xl bg-gradient-to-b from-[#FFE7B5] to-[#FFD97A] border-2 border-[#E0A81F] flex items-center justify-center shadow-inner">
                  <span className="font-display text-3xl sm:text-4xl text-[#8A5A14]">1st</span>
                </div>
              </div>
            )}

            {/* Rank 3 (Bronze) */}
            {top3 && (
              <div className="flex flex-col items-center order-3 text-center">
                <div className="relative mb-2">
                  <UserAvatar
                    photoURL={top3.photoURL || top3.avatarSeed}
                    displayName={top3.displayName}
                    size="xl"
                    className="shadow-md ring-2 ring-[#FDBA74]"
                  />
                  <span className="absolute -bottom-2 inset-x-0 mx-auto w-6 h-6 rounded-full bg-[#D97706] border-2 border-white text-white font-black text-xs flex items-center justify-center shadow">
                    3
                  </span>
                </div>
                <p className="font-display text-xs sm:text-sm text-[#1E2233] mt-2 line-clamp-1">
                  {top3.displayName}
                  {top3.userId === user?.userId && <span className="block text-[10px] text-[#12A594] font-extrabold">(You)</span>}
                </p>
                <span className="text-[11px] sm:text-xs font-black text-[#B45309] mt-0.5">{top3.xp} XP</span>
                <span className="text-[10px] font-bold text-[#D97706]">Lv {top3.level}</span>

                {/* Pedestal 3 */}
                <div className="w-full h-20 sm:h-22 mt-3 rounded-t-2xl bg-gradient-to-b from-[#FED7AA] to-[#FDBA74] border-2 border-[#C2410C] flex items-center justify-center shadow-inner">
                  <span className="font-display text-xl sm:text-2xl text-[#9A3412]">3rd</span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Full Leaderboard Table */}
      <section aria-labelledby="leaderboard-table-title" className={`${card} p-4 sm:p-6 space-y-4`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 id="leaderboard-table-title" className="text-lg font-display text-[#1E2233]">
            {classLabel(selectedClass)} Student Rankings
          </h3>
          <span className="text-xs font-bold text-[#6B7280]">
            Ranked by total XP earned
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm font-semibold text-[#6B7280]">
            Loading leaderboard…
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<Trophy className="w-6 h-6" />}
            title="No students yet in this class"
            body="Be the first to complete a lesson and claim the #1 spot!"
            action={
              <Link to="/app/subjects" className={btnPrimary}>
                Start a lesson
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[color:var(--card-line)] text-[11px] font-black uppercase tracking-wider text-[#6B7280]">
                  <th className="py-3 px-3 text-center w-14">Rank</th>
                  <th className="py-3 px-3">Student</th>
                  <th className="py-3 px-3 text-center hidden sm:table-cell">Level</th>
                  <th className="py-3 px-3 text-center hidden md:table-cell">Lessons Done</th>
                  <th className="py-3 px-3 text-center hidden sm:table-cell">Streak</th>
                  <th className="py-3 px-3 text-right">Total XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3FB]">
                {entries.map((entry, index) => {
                  const rank = index + 1;
                  const isCurrentUser = entry.userId === user?.userId;

                  return (
                    <tr
                      key={entry.userId}
                      className={`transition-colors ${
                        isCurrentUser
                          ? 'bg-[color:var(--brand-soft)] font-bold'
                          : 'hover:bg-[color:var(--page)]'
                      }`}
                    >
                      {/* Rank column */}
                      <td className="py-3 px-3 text-center">
                        {rank <= 3 ? (
                          <RankBadge rank={rank} />
                        ) : (
                          <span className="inline-flex items-center justify-center w-8 h-8 font-display text-sm text-[#6B7280]">{rank}</span>
                        )}
                      </td>

                      {/* Student info */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            photoURL={entry.photoURL || entry.avatarSeed}
                            displayName={entry.displayName}
                            size="md"
                            className="shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-extrabold truncate text-[#1E2233] flex items-center gap-1.5">
                              <span>{entry.displayName}</span>
                              {isCurrentUser && (
                                <span className="px-2 py-0.5 rounded-full bg-[color:var(--brand)] text-white text-[10px] font-black tracking-wide">
                                  YOU
                                </span>
                              )}
                            </p>
                            <span className="text-[11px] font-bold text-[#6B7280] sm:hidden">
                              Lv {entry.level} · {entry.completedCount} lessons
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Level */}
                      <td className="py-3 px-3 text-center hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F1F3FB] border border-[#E3E5EC] text-xs font-extrabold text-[#4B5168]">
                          Lv {entry.level}
                        </span>
                      </td>

                      {/* Lessons completed */}
                      <td className="py-3 px-3 text-center hidden md:table-cell">
                        <span className="text-xs font-extrabold text-[#4B5168]">
                          {entry.completedCount}
                        </span>
                      </td>

                      {/* Streak */}
                      <td className="py-3 px-3 text-center hidden sm:table-cell">
                        {entry.streak_days > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-[#E0603F]">
                            <Flame className="w-3.5 h-3.5 fill-current" /> {entry.streak_days}d
                          </span>
                        ) : (
                          <span className="text-xs text-[#9AA1B4] font-semibold">—</span>
                        )}
                      </td>

                      {/* Total XP */}
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs sm:text-[13px] font-black ${
                            rank <= 3
                              ? 'bg-[#FFF0CF] text-[#B87A06] border border-[#FFD97A]'
                              : 'bg-[#E7F7F1] text-[#0B7A67] border border-[#A9E6D3]'
                          }`}
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{entry.xp} XP</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* How to earn XP Explainer card */}
      <section aria-label="How to earn XP" className="rounded-[24px] bg-[#FFFBF0] border-[3px] border-[#FFD97A] p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-[14px] bg-[#FFC53D] text-[#1E2233] flex items-center justify-center font-display shadow-sm">
            <Zap className="w-5 h-5" />
          </span>
          <div>
            <h4 className="font-display text-base text-[#1E2233]">How to earn XP and climb the leaderboard</h4>
            <p className="text-xs font-semibold text-[#8A5A14]">Level up your knowledge and compete with your classmates</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-2xl p-3.5 border-2 border-[#FFE7B5] flex items-start gap-3">
            <span className="w-8 h-8 rounded-xl bg-[#E7F7F1] text-[#12A594] flex items-center justify-center shrink-0 font-display text-sm">
              <BookOpenCheck className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-extrabold text-[#1E2233]">Finish Video Lessons</p>
              <p className="text-[11px] font-semibold text-[#6B7280] mt-0.5">
                Earn <strong className="text-[#12A594]">+50 XP</strong> for every completed NCERT video lesson.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border-2 border-[#FFE7B5] flex items-start gap-3">
            <span className="w-8 h-8 rounded-xl bg-[#FFE8E0] text-[#E0603F] flex items-center justify-center shrink-0 font-display text-sm">
              <Flame className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-extrabold text-[#1E2233]">Maintain Daily Streaks</p>
              <p className="text-[11px] font-semibold text-[#6B7280] mt-0.5">
                Keep studying every day to build long streaks and unlock elite badges.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border-2 border-[#FFE7B5] flex items-start gap-3">
            <span className="w-8 h-8 rounded-xl bg-[#DDF5EE] text-[#0C8F78] flex items-center justify-center shrink-0">
              <Timer className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-extrabold text-[#1E2233]">Finish Focus Blocks</p>
              <p className="text-[11px] font-semibold text-[#6B7280] mt-0.5">
                Earn <strong className="text-[#0C8F78]">+25 XP</strong> for each focus block of 15 minutes or more.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border-2 border-[#FFE7B5] flex items-start gap-3">
            <span className="w-8 h-8 rounded-xl bg-[#F0E9FF] text-[#6D3FE0] flex items-center justify-center shrink-0 font-display text-sm">
              <GraduationCap className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-extrabold text-[#1E2233]">Level Up</p>
              <p className="text-[11px] font-semibold text-[#6B7280] mt-0.5">
                Every <strong className="text-[#6D3FE0]">100 XP</strong> earns you a new student level and badge status.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-1 flex justify-end">
          <Link to="/app/subjects" className={`${btnAccent} text-xs px-4 py-2`}>
            Start Learning Now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
};
