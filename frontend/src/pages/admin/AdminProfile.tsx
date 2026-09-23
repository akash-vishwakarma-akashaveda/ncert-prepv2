import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut, Mail, KeyRound, MessageCircleQuestion, MessageSquare, Sliders, Database, Eye, Layers, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DoubtsService } from '../../services/content';
import { FirestoreService } from '../../services/firestore';
import { Card, SectionHeader, StatCard, inputClass, primaryButton, secondaryButton } from './adminUi';

const SIGN_IN_METHOD: Record<string, string> = { 'google.com': 'Google account', password: 'Email and password' };

/** Educator account page: identity, reply name, workload and access. Students get ProfileSettings instead. */
export const AdminProfile: React.FC = () => {
  const { user, isDemoUser, reauthProviderId, updateProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [counts, setCounts] = useState<{ doubts: number; feedback: number } | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([DoubtsService.listAll(), FirestoreService.getFeedbackList()])
      .then(([doubts, feedback]) => {
        if (active)
          setCounts({ doubts: doubts.filter((d) => d.status === 'open').length, feedback: feedback.filter((f) => f.status !== 'reviewed').length });
      })
      .catch(() => active && setCounts({ doubts: 0, feedback: 0 }));
    return () => {
      active = false;
    };
  }, []);

  if (!user) return null;

  const trimmed = name.trim();
  const changed = trimmed !== (user.displayName || '').trim();

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed || !changed) return;
    setSaving(true);
    setError('');
    try {
      await updateProfile({ displayName: trimmed });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Could not save your name. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const logOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const method = isDemoUser ? 'Demo account (this browser only)' : SIGN_IN_METHOD[reauthProviderId || ''] || 'Signed in';
  const links = [
    { label: 'Student doubts', to: '/app?tab=doubts', Icon: MessageCircleQuestion },
    { label: 'Dashboard control', to: '/app?tab=student-control', Icon: Sliders },
    { label: 'Classes & chapters', to: '/app?tab=curriculum', Icon: Layers },
    { label: 'Data & sync', to: '/app?tab=data', Icon: Database },
    { label: 'Student syllabus view', to: '/browse', Icon: Eye },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Profile & settings" description="Your educator account, the name students see on your replies, and console access." />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)] gap-5 items-start">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center gap-4">
              <span className="w-16 h-16 rounded-[20px] bg-[#1E2233] text-white font-display text-2xl flex items-center justify-center shrink-0">
                {(user.displayName || user.email || 'A').charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-xl text-[#1E2233] truncate">{user.displayName || 'Educator'}</h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1E2233] text-white text-[11px] font-extrabold">
                    <Shield className="w-3.5 h-3.5 text-[#A9E6D3]" /> Administrator
                  </span>
                  {isDemoUser && <span className="px-2.5 py-0.5 rounded-full bg-[#FFF1D6] text-[#8A5A14] text-[11px] font-extrabold">Demo</span>}
                </div>
                <p className="mt-1 text-sm font-semibold text-[#6B7280] flex flex-wrap gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="w-4 h-4" /> {user.email || 'No email on this account'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4" /> {method}
                  </span>
                </p>
              </div>
            </div>

            <form onSubmit={saveName} className="pt-5 border-t-2 border-[#EDEFF6] space-y-2">
              <label htmlFor="admin-name" className="block text-sm font-extrabold text-[#1E2233]">
                Name shown to students
              </label>
              <p className="text-xs font-semibold text-[#6B7280]">
                Students see this next to your doubt replies, and it is saved on notes you edit. A clear name such as "Priya Ma'am" works well.
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  id="admin-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  className={`${inputClass} max-w-sm`}
                  placeholder="Your name"
                />
                <button type="submit" disabled={!trimmed || !changed || saving} className={primaryButton}>
                  {saving ? 'Saving…' : 'Save name'}
                </button>
                {saved && (
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#0B7A67]">
                    <Check className="w-4 h-4" /> Saved
                  </span>
                )}
              </div>
              {error && <p className="text-xs font-bold text-[#C24A2C]">{error}</p>}
            </form>
          </Card>

          <Card className="p-5 sm:p-6 space-y-3">
            <h3 className="font-display text-lg text-[#1E2233] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#3B4FE0]" /> Access and security
            </h3>
            <ul className="space-y-2 text-sm font-semibold text-[#4B5168]">
              <li>Admin rights come from <code className="px-1.5 py-0.5 rounded bg-[#F1F3FB] text-[12px]">users/{'{uid}'}.role = "admin"</code>, set only in the Firebase Console. They can't be granted or removed from this app.</li>
              <li>To hand over or remove admin access, change that field in the Firebase Console.</li>
              <li>Sign out when you use a shared or school computer.</li>
            </ul>
            <button onClick={logOut} className={`${secondaryButton} mt-1`}>
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </Card>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Open doubts"
              value={counts ? counts.doubts : '…'}
              hint={counts?.doubts ? 'Waiting for your reply' : 'All answered'}
              tone={counts?.doubts ? 'rose' : 'teal'}
              onClick={() => navigate('/app?tab=doubts')}
            />
            <StatCard
              label="New feedback"
              value={counts ? counts.feedback : '…'}
              hint={counts?.feedback ? 'Not reviewed yet' : 'Nothing new'}
              tone={counts?.feedback ? 'amber' : 'teal'}
              onClick={() => navigate('/app?tab=feedback')}
            />
          </div>

          <Card className="p-5 space-y-2">
            <h3 className="font-display text-lg text-[#1E2233]">Quick links</h3>
            <ul className="divide-y-2 divide-[#F4F5F9]">
              {links.map(({ label, to, Icon }) => (
                <li key={to}>
                  <button
                    onClick={() => navigate(to)}
                    className="w-full flex items-center gap-3 py-2.5 text-left text-sm font-extrabold text-[#1E2233] hover:text-[#3B4FE0] cursor-pointer"
                  >
                    <span className="w-8 h-8 rounded-[11px] bg-[#EEF0FE] text-[#3B4FE0] flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </span>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <p className="flex items-start gap-2 px-1 text-xs font-semibold text-[#6B7280]">
            <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
            Student features (class, avatar, XP, reminders) are hidden here because they don't apply to educator accounts.
          </p>
        </div>
      </div>
    </div>
  );
};
