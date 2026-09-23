import React, { useState } from 'react';
import {
  LogOut,
  CheckCircle2,
  Star,
  AlertTriangle,
  Shield,
  GraduationCap,
  Flame,
  Award,
  Download,
  Check,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProgress } from '../../context/ProgressContext';
import { Video } from '../../types';
import { classLabel, currentStreak } from '../../data/gamification';
import { ClassTile } from '../home/ClassGrid';
import { CUTE_CHARACTERS, UserAvatar } from '../../data/avatars';
import { XpHistoryCard } from './XpHistoryCard';
import { LeaderboardService } from '../../services/leaderboard';

interface ProfileSettingsProps {
  videoMap: Map<string, Video>;
  onOpenAdmin?: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  videoMap,
  onOpenAdmin,
}) => {
  const { user, isDemoUser, isAdmin, signOut, updateProfile, deleteAccount, reauthProviderId, reauthenticate } = useAuth();
  const {
    completedCount,
    favoritesCount,
    favoriteIds,
    progressMap,
    totalXp,
    level,
    xpInLevel,
    xpToNext,
    xpHistory,
  } = useProgress();

  const [savingSettings, setSavingSettings] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [profileUpdated, setProfileUpdated] = useState(false);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [selectedGrade, setSelectedGrade] = useState(user?.grade_preference || '');
  const [studyGoal, setStudyGoal] = useState<number>(user?.study_goal_minutes || 25);
  const [focusSubjects, setFocusSubjects] = useState<string[]>(user?.focus_subjects || []);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(user?.photoURL || 'owl');
  const [avatarSaved, setAvatarSaved] = useState(false);

  const subjectsForSelectedGrade = React.useMemo(() => {
    const set = new Set<string>();
    videoMap.forEach((v) => {
      if (v.isActive && v.class_sort === selectedGrade) set.add(v.subject);
    });
    return Array.from(set).sort();
  }, [videoMap, selectedGrade]);

  if (!user) return null;

  const streak = currentStreak(user);
  const classChanged = Boolean(user.grade_preference) && selectedGrade !== user.grade_preference;

  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade);
    setFocusSubjects([]);
  };

  const toggleFocusSubject = (subject: string) => {
    setFocusSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const handleSelectAvatar = async (avatarId: string) => {
    setSelectedAvatar(avatarId);
    try {
      await updateProfile({ photoURL: avatarId });
      setAvatarSaved(true);
      setTimeout(() => setAvatarSaved(false), 2500);
    } catch (err) {
      console.error('Failed to update avatar:', err);
    }
  };

  const handleSaveAcademicPreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrade) return;
    setSavingSettings(true);
    try {
      const updatedUser = {
        ...user,
        displayName: displayName.trim() || user.displayName,
        grade_preference: selectedGrade,
        study_goal_minutes: studyGoal,
        focus_subjects: focusSubjects.filter((s) => subjectsForSelectedGrade.includes(s)),
        photoURL: selectedAvatar,
      };
      await updateProfile({
        displayName: displayName.trim() || user.displayName,
        grade_preference: selectedGrade,
        study_goal_minutes: studyGoal,
        focus_subjects: focusSubjects.filter((s) => subjectsForSelectedGrade.includes(s)),
        photoURL: selectedAvatar,
      });
      // Immediately migrate leaderboard entry to ensure strict class isolation
      await LeaderboardService.syncUserLeaderboardEntry(
        updatedUser,
        completedCount,
        undefined,
        totalXp
      );
      setProfileUpdated(true);
      setTimeout(() => setProfileUpdated(false), 3000);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportData = () => {
    const exportPayload = {
      user: {
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
        grade_preference: user.grade_preference,
        focus_subjects: user.focus_subjects,
        study_goal_minutes: user.study_goal_minutes,
        streak_days: user.streak_days,
        reminders_enabled: user.reminders_enabled,
        reminder_frequency: user.reminder_frequency,
        reminder_hour: user.reminder_hour,
        consent: user.consent,
      },
      watchHistory: progressMap,
      favoriteIds,
      completedCount,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ncert-prep-data-${user.userId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteError(null);
    setNeedsReauth(false);
    setReauthPassword('');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      if (needsReauth) {
        await reauthenticate(reauthPassword);
      }
      await deleteAccount();
    } catch (err) {
      const message = (err as Error).message;
      if (message === 'requires-recent-login') {
        setNeedsReauth(true);
        setDeleteError('For your security, confirm it is you before we delete everything.');
      } else {
        setDeleteError(message || 'Something went wrong. Please try again.');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Profile Overview Card */}
      <div className="bg-white border-[3px] border-[color:var(--card-line)] rounded-[26px] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <UserAvatar
              photoURL={selectedAvatar || user.photoURL}
              displayName={user.displayName}
              size="xl"
              className="shadow-md ring-4 ring-[#F1F3FB]"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[23px] text-[#1E2233]">
                  {user.displayName || 'Revision Student'}
                </h1>
                <span
                  className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    isAdmin
                      ? 'bg-[#1E2233] text-white'
                      : 'bg-[color:var(--brand-soft)] text-[color:var(--brand-edge)] border border-[color:var(--brand-line)]'
                  }`}
                >
                  {isAdmin ? 'Administrator' : 'Student Account'}
                </span>
                {isDemoUser && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FFF6E2] border border-[#FFD97A] text-[#8A5A14]">
                    Demo Account
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">
                {user.email || 'Verified Student Profile'}
                {!isAdmin && (
                  <>
                    {' • '}
                    <span className="font-bold text-[#1E2233]">{classLabel(user.grade_preference)}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {isAdmin && onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 px-[18px] py-2.5 text-[12.5px] font-extrabold text-[color:var(--brand)] bg-[color:var(--brand-soft)] border-2 border-[color:var(--brand-line)] rounded-[14px] cursor-pointer"
                title="Manage syllabus, videos and reviews"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Console</span>
              </button>
            )}

            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 px-[18px] py-2.5 text-[12.5px] font-extrabold text-[#6B7280] bg-[color:var(--page)] hover:bg-[color:var(--card-line)] border-2 border-[#E3E5EC] rounded-[14px] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Revision Stats Counter */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t-2 border-[color:var(--card-line)]">
          <div className="stat-tile p-4 bg-white rounded-[22px] border-[3px] border-[color:var(--card-line)] shadow-[0_5px_0_var(--card-line)] flex flex-col-reverse gap-1" style={{ ['--tint' as string]: '#0C8F78', ['--tint-soft' as string]: '#DDF5EE' }}>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#6B7280]">
              <CheckCircle2 className="w-4 h-4 text-[#12A594]" />
              <span>Completed</span>
            </div>
            <p className="font-display text-[26px] leading-none text-[#12A594]">{completedCount}</p>
          </div>

          <div className="stat-tile p-4 bg-white rounded-[22px] border-[3px] border-[color:var(--card-line)] shadow-[0_5px_0_var(--card-line)] flex flex-col-reverse gap-1" style={{ ['--tint' as string]: '#C9447F', ['--tint-soft' as string]: '#FDE6F0' }}>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#6B7280]">
              <Star className="w-4 h-4 text-[#C98A0E] fill-[#FFC53D]" />
              <span>Saved Lessons</span>
            </div>
            <p className="font-display text-[26px] leading-none text-[color:var(--brand)]">{favoritesCount}</p>
          </div>

          <div className="stat-tile p-4 bg-white rounded-[22px] border-[3px] border-[color:var(--card-line)] shadow-[0_5px_0_var(--card-line)] flex flex-col-reverse gap-1" style={{ ['--tint' as string]: '#E0603F', ['--tint-soft' as string]: '#FFE8E0' }}>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#6B7280]">
              <Flame className="w-4 h-4 text-[#FF7A59]" />
              <span>Revision Streak</span>
            </div>
            <p className="font-display text-[26px] leading-none text-[#FF7A59]">
              {streak} {streak === 1 ? 'Day' : 'Days'}
            </p>
          </div>

          <div className="stat-tile p-4 bg-white rounded-[22px] border-[3px] border-[color:var(--card-line)] shadow-[0_5px_0_var(--card-line)] flex flex-col-reverse gap-1" style={{ ['--tint' as string]: '#B87A06', ['--tint-soft' as string]: '#FFF0CF' }}>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#6B7280]">
              <Award className="w-4 h-4 text-[color:var(--brand)]" />
              <span>Total XP</span>
            </div>
            <p className="font-display text-[26px] leading-none text-[#C98A0E]">{totalXp} XP</p>
          </div>
        </div>
      </div>

      {/* Choose Your Cute Study Avatar */}
      <section aria-label="Choose your avatar" className="bg-white border-[3px] border-[color:var(--card-line)] rounded-[26px] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-[14px] bg-[#FFF0CF] text-[#B87A06] flex items-center justify-center font-display border border-[#FFD97A]">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-display text-[#1E2233]">Choose your avatar</h2>
              <p className="text-xs font-semibold text-[#6B7280]">
                Pick a study buddy. It shows on your profile and on your class leaderboard.
              </p>
            </div>
          </div>
          {avatarSaved && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E7F7F1] border-2 border-[#A9E6D3] text-[#0B7A67] text-xs font-black shadow-sm">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </span>
          )}
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-3 sm:gap-4 pt-1">
          {CUTE_CHARACTERS.map((char) => {
            const isSelected = (selectedAvatar || user.photoURL || 'owl') === char.id;
            return (
              <button
                key={char.id}
                type="button"
                onClick={() => handleSelectAvatar(char.id)}
                className={`relative group rounded-[22px] p-3.5 border-[3px] flex flex-col items-center gap-2 text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#FFF8E6] border-[#FFC53D] shadow-[0_4px_0_#E0A81F] scale-[1.02]'
                    : 'bg-white border-[color:var(--card-line)] hover:border-[color:var(--brand-line)] hover:bg-[color:var(--page)]'
                }`}
                aria-pressed={isSelected}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#12A594] text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
                <div
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-[20px] p-1.5 border-2 flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{ background: char.bg, borderColor: char.border }}
                >
                  {char.svg}
                </div>
                <div className="min-w-0 w-full">
                  <p className="text-[13px] font-display leading-tight text-[#1E2233]">{char.name}</p>
                  <p className="mt-0.5 text-[10.5px] font-bold leading-tight text-[#6B7280]">{char.title}</p>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                    isSelected
                      ? 'bg-[#FFC53D] text-[#1E2233] border-[#E0A81F]'
                      : 'bg-[#F1F3FB] text-[#4B5168] border-[#E3E5EC]'
                  }`}
                >
                  {char.badge}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* XP Credit History & Ledger */}
      <XpHistoryCard
        totalXp={totalXp}
        level={level}
        xpInLevel={xpInLevel}
        xpToNext={xpToNext}
        history={xpHistory}
        activeClass={user.grade_preference || selectedGrade}
      />

      {/* Academic Target & Grade Preferences */}
      <form onSubmit={handleSaveAcademicPreferences} className="bg-white border-[3px] border-[color:var(--card-line)] rounded-[26px] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[color:var(--brand)]/10 text-[color:var(--brand)] flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg text-[#1E2233]">Profile & Class</h2>
              <p className="text-xs text-[#6B7280]">
                Your name, the class you are studying in, focus subjects and daily study target
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {profileUpdated && (
              <span className="text-xs font-extrabold text-[#0B7A67] bg-[#E7F7F1] px-3 py-1 rounded-full border border-[#A9E6D3] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="max-w-md">
            <label className="block text-xs font-extrabold text-[#1E2233] mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              maxLength={60}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-bold border-2 border-[#E3E5EC] rounded-2xl bg-[#F7F8FC] focus:bg-white focus:border-[color:var(--brand)] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-[#1E2233] mb-1.5">
              Your Class
            </label>
            <div role="group" aria-label="Your class" className="grid grid-cols-[repeat(auto-fill,minmax(60px,1fr))] gap-2.5 pb-1">
              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((c) => (
                <ClassTile key={c} classSort={c} size="sm" selected={selectedGrade === c} onClick={() => handleGradeChange(c)} />
              ))}
            </div>
            <p className="text-[11px] text-[#6B7280] mt-1">
              You study one class at a time. Your dashboard, syllabus and search follow this class.
            </p>
          </div>
        </div>

        {classChanged && (
          <div className="p-3 text-xs text-[#8A5A14] bg-[#FFF6E2] border border-[#FFD97A] rounded-[14px]">
            You are switching from <strong>{classLabel(user.grade_preference)}</strong> to{' '}
            <strong>{classLabel(selectedGrade)}</strong>. Your completed lessons and favourites from{' '}
            {classLabel(user.grade_preference)} are kept, but your dashboard and syllabus will show{' '}
            {classLabel(selectedGrade)} after you save.
          </div>
        )}

        <div>
          <label className="block text-xs font-extrabold text-[#1E2233] mb-1.5">
            Focus Subjects <span className="font-semibold text-[#6B7280]">(shown first on your dashboard)</span>
          </label>
          {subjectsForSelectedGrade.length === 0 ? (
            <p className="text-xs text-[#6B7280]">
              {selectedGrade ? 'No lessons published for this class yet.' : 'Select your class first.'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {subjectsForSelectedGrade.map((subject) => {
                const active = focusSubjects.includes(subject);
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleFocusSubject(subject)}
                    aria-pressed={active}
                    className={`px-3 py-1.5 text-xs font-extrabold rounded-[14px] border transition-all cursor-pointer ${
                      active
                        ? 'border-[color:var(--brand)] bg-[#EEEDFE] text-[color:var(--brand)]'
                        : 'border-[#E3E5EC] bg-white text-[#6B7280] hover:bg-[color:var(--page)]'
                    }`}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <label className="block text-xs font-extrabold text-[#1E2233] mb-1.5">
              Daily Focus Target
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setStudyGoal(mins)}
                  className={`py-2 text-xs font-extrabold rounded-[14px] border transition-all cursor-pointer ${
                    studyGoal === mins
                      ? 'border-[color:var(--brand)] bg-[#EEEDFE] text-[color:var(--brand)]'
                      : 'border-[#E3E5EC] bg-white text-[#6B7280] hover:bg-[color:var(--page)]'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-[#E3E5EC]">
          <button
            type="submit"
            disabled={savingSettings || !selectedGrade}
            className="px-5 py-2 text-xs font-extrabold text-white btn-3d [--edge:var(--brand-edge)] bg-[color:var(--brand)] hover:bg-[color:var(--brand-hover)] rounded-[14px] shadow-[0_4px_0_var(--card-line)] transition-colors cursor-pointer disabled:opacity-50"
          >
            {savingSettings ? 'Saving...' : classChanged ? `Switch to ${classLabel(selectedGrade)}` : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Account Deletion & DPDP Data Rights (NFR-1 & NFR-11) */}
      <div className="bg-white border-[3px] border-[color:var(--card-line)] rounded-[26px] p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg text-[#1E2233]">Your data & consent</h3>
            <p className="text-xs font-semibold text-[#6B7280]">
              {user.consent?.status === 'granted'
                ? `Consent given ${user.consent.method === 'parent' ? `by your parent/guardian (${user.consent.parent_email})` : 'by you'} under notice version ${user.consent.notice_version}.`
                : 'Consent not recorded.'}{' '}
              <a href="/privacy" className="text-[color:var(--brand)] font-extrabold">Read the privacy notice</a>
            </p>
          </div>

          <button
            onClick={handleExportData}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold text-[color:var(--brand)] bg-[#EEEDFE] hover:bg-[#DDD6FE] rounded-[14px] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export My Data (JSON)</span>
          </button>
        </div>

        <div className="pt-3 border-t border-[#E3E5EC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-extrabold text-[#8A2E17]">Withdraw consent</p>
            <p className="text-[11px] font-semibold text-[#6B7280]">
              Stops all processing and permanently erases your account, progress, saved lessons, doubts and reminder settings.
            </p>
          </div>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="self-start sm:self-auto px-3.5 py-1.5 text-xs font-extrabold text-[#C24A2C] bg-[#FFE9E2] hover:bg-[#FFDCD0] border border-rose-300 rounded-[14px] transition-colors cursor-pointer shrink-0"
          >
            Withdraw consent & delete
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E2233]/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[22px] max-w-md w-full p-6 border-2 border-[#E3E5EC] shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FFDCD0] text-[#C24A2C] flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg text-[#1E2233]">
              Withdraw consent and delete everything?
            </h3>
            <p className="text-xs text-[#6B7280]">
              This action cannot be undone. All your watch history, progress checkmarks, favourites, and revision reminder subscriptions will be permanently purged from the database.
            </p>

            {deleteError && (
              <p className="p-3 text-xs text-[#8A2E17] bg-[#FFE9E2] border border-[#FFC3B1] rounded-[14px]">{deleteError}</p>
            )}
            {needsReauth && reauthProviderId === 'password' && (
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password to confirm"
                value={reauthPassword}
                onChange={(e) => setReauthPassword(e.target.value)}
                className="w-full px-4 py-3 text-sm font-bold border-2 border-[#E3E5EC] rounded-2xl bg-[#F7F8FC] focus:border-[color:var(--brand)] outline-none"
              />
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={closeDeleteModal}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold text-[#6B7280] hover:bg-[color:var(--page)] rounded-[14px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || (needsReauth && reauthProviderId === 'password' && !reauthPassword)}
                className="px-4 py-2 text-xs font-extrabold text-white bg-[#FF7A59] hover:bg-rose-700 rounded-[14px] cursor-pointer"
              >
                {deleting
                  ? 'Deleting...'
                  : needsReauth
                  ? reauthProviderId === 'password' ? 'Confirm & delete' : 'Confirm with Google & delete'
                  : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
