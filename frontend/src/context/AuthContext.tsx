import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthService, BackendUser, toFrontendUser } from '../services/auth';
import { ApiError } from '../services/api/client';
import { User } from '../types';
import { NoticeLang } from '../data/privacyNotice';
import { nextStreak } from '../data/gamification';
import { StatsService } from '../services/stats';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  // Google sign-in via Google Identity Services, or email + password (verified by email link),
  // both backed by our own API.
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string, referralCode?: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  /** False only for email/password accounts that have not clicked the verification link yet. */
  emailVerified: boolean;
  resendVerification: () => Promise<void>;
  /** Re-reads verification state after the user clicks the link in their inbox. */
  refreshEmailVerified: () => Promise<boolean>;
  // DPDP consent, recorded server-side.
  /** Self-consent for 13 and over; `ageBand` records 13–17 vs 18+. */
  giveAdultConsent: (language: NoticeLang, ageBand?: '13-17' | 'adult') => Promise<void>;
  giveMinorConsent: (body: { ageBand: 'under13'; parentName: string; parentEmail: string; parentPhone: string; language: NoticeLang }) => Promise<void>;
  requestParentConsent: (parentName: string, parentEmail: string, language: NoticeLang) => Promise<string>;
  signOut: () => Promise<void>;
  /** Bumps the server-side session version, invalidating every session on every device (including this one). */
  signOutAllDevices: () => Promise<void>;
  applyReferralCode: (code: string) => Promise<void>;
  updateSettings: (settings: Partial<Pick<User, 'reminders_enabled' | 'reminder_frequency' | 'reminder_hour'>>) => Promise<void>;
  updateProfile: (updates: Partial<Omit<User, 'role' | 'userId'>>) => Promise<void>;
  recordStudyActivity: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** 'google.com' or 'password': how the user must re-confirm before deletion. */
  reauthProviderId: string | null;
  reauthenticate: (password?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Frontend User field -> backend field, for the profile/settings PATCH endpoints.
function toBackendProfileUpdate(updates: Partial<Omit<User, 'role' | 'userId'>>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (updates.displayName !== undefined) out.displayName = updates.displayName;
  if (updates.photoURL !== undefined) out.photoUrl = updates.photoURL;
  if (updates.phoneNumber !== undefined) out.phoneNumber = updates.phoneNumber;
  if (updates.city !== undefined) out.city = updates.city ?? '';
  if (updates.grade_preference !== undefined) out.classGrade = parseInt(updates.grade_preference, 10) || undefined;
  if (updates.study_goal_minutes !== undefined) out.studyGoalMinutes = updates.study_goal_minutes;
  if (updates.focus_subjects !== undefined) out.focusSubjects = updates.focus_subjects;
  if (updates.stream !== undefined) out.stream = updates.stream ?? '';
  if (updates.last_watched_video !== undefined && updates.last_watched_video !== null) out.lastWatchedVideo = updates.last_watched_video;
  if (updates.onboarding_completed !== undefined) out.onboardingCompleted = updates.onboarding_completed;
  if (updates.streak_days !== undefined) out.streak = updates.streak_days;
  if (updates.last_active_date !== undefined) out.lastActiveDate = updates.last_active_date;
  return out;
}

function toBackendSettings(settings: Partial<Pick<User, 'reminders_enabled' | 'reminder_frequency' | 'reminder_hour'>>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (settings.reminders_enabled !== undefined) out.remindersEnabled = settings.reminders_enabled;
  if (settings.reminder_frequency !== undefined) out.reminderFrequency = settings.reminder_frequency;
  if (settings.reminder_hour !== undefined) out.reminderHour = settings.reminder_hour;
  return out;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [emailVerified, setEmailVerified] = useState<boolean>(true);
  const [authProvider, setAuthProvider] = useState<'password' | 'google.com' | null>(null);

  const applyBackendUser = (backendUser: BackendUser) => {
    setUser(toFrontendUser(backendUser));
    setEmailVerified(backendUser.emailVerified);
    setAuthProvider(backendUser.provider);
  };

  // A saved referral link is applied once to a new account (Google sign-ups never see the referral field).
  // Valid or not, the code is forgotten afterwards so it is never retried on every page load.
  useEffect(() => {
    if (!user || user.has_referrer || user.onboarding_completed) return;
    let code: string | null = null;
    try {
      code = localStorage.getItem('signup_ref');
    } catch {
      return;
    }
    if (!code) return;
    AuthService.applyReferralCode(code)
      .then(applyBackendUser)
      .catch((err) => console.warn('Referral code not applied:', (err as Error).message))
      .finally(() => {
        try {
          localStorage.removeItem('signup_ref');
        } catch {
          /* ignore */
        }
      });
  }, [user?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // On load: ask the API if we have a session cookie.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const backendUser = await AuthService.me();
        if (!cancelled && backendUser) applyBackendUser(backendUser);
      } catch (err) {
        console.error('Error loading the current user:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Count the visit once auth has settled (and again on sign-in, to count active students). Once per day per browser.
  useEffect(() => {
    if (!loading) StatsService.trackVisit(user?.userId);
  }, [loading, user?.userId]);

  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      const backendUser = await AuthService.signInWithGoogle();
      applyBackendUser(backendUser);
      setAuthModalOpen(false);
    } catch (err) {
      console.error('Google Sign-In failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const backendUser = await AuthService.signInWithEmail(email.trim(), password);
      applyBackendUser(backendUser);
      setAuthModalOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const signUpWithEmail = useCallback(async (name: string, email: string, password: string, referralCode?: string) => {
    setLoading(true);
    try {
      const backendUser = await AuthService.signUpWithEmail(name.trim(), email.trim(), password, referralCode?.trim());
      applyBackendUser(backendUser);
      setAuthModalOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await AuthService.sendPasswordReset(email.trim());
  }, []);

  const resendVerification = useCallback(async () => {
    await AuthService.resendVerification();
  }, []);

  const refreshEmailVerified = useCallback(async () => {
    const backendUser = await AuthService.me();
    if (!backendUser) return true;
    setEmailVerified(backendUser.emailVerified);
    return backendUser.emailVerified;
  }, []);

  const giveAdultConsent = useCallback(async (language: NoticeLang, ageBand: '13-17' | 'adult' = 'adult') => {
    const backendUser = await AuthService.giveAdultConsent(language, ageBand);
    applyBackendUser(backendUser);
  }, []);

  const giveMinorConsent = useCallback(async (body: { ageBand: 'under13'; parentName: string; parentEmail: string; parentPhone: string; language: NoticeLang }) => {
    applyBackendUser(await AuthService.giveMinorConsent(body));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const requestParentConsent = useCallback(async (parentName: string, parentEmail: string, language: NoticeLang) => {
    const { parentEmail: sentTo } = await AuthService.requestParentConsent(parentName, parentEmail, language);
    const backendUser = await AuthService.me();
    if (backendUser) applyBackendUser(backendUser);
    return sentTo;
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await AuthService.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    setUser(null);
    setAuthProvider(null);
    setLoading(false);
  }, []);

  const signOutAllDevices = useCallback(async () => {
    setLoading(true);
    try {
      await AuthService.signOutAllDevices();
    } catch (err) {
      console.warn('Sign out all devices error:', err);
    }
    setUser(null);
    setAuthProvider(null);
    setLoading(false);
  }, []);

  const applyReferralCode = useCallback(async (code: string) => {
    applyBackendUser(await AuthService.applyReferralCode(code));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSettings = useCallback(
    async (settings: Partial<Pick<User, 'reminders_enabled' | 'reminder_frequency' | 'reminder_hour'>>) => {
      if (!user) return;
      const backendUser = await AuthService.updateSettings(toBackendSettings(settings));
      applyBackendUser(backendUser);
    },
    [user]
  );

  const updateProfile = useCallback(
    async (updates: Partial<Omit<User, 'role' | 'userId'>>) => {
      if (!user) return;
      const backendUser = await AuthService.updateProfile(toBackendProfileUpdate(updates));
      applyBackendUser(backendUser);
    },
    [user]
  );

  const recordStudyActivity = useCallback(async () => {
    if (!user) return;
    const next = nextStreak(user);
    if (next.last_active_date === user.last_active_date && next.streak_days === user.streak_days) return;
    await updateProfile(next);
  }, [user, updateProfile]);

  // Throws Error('requires-recent-login') when the server wants a fresh sign-in first.
  const deleteAccount = useCallback(async () => {
    if (!user) return;
    try {
      await AuthService.deleteAccount();
    } catch (err) {
      if (err instanceof ApiError && err.message === 'requires-recent-login') throw new Error('requires-recent-login');
      throw new Error('We could not finish deleting your account. Please try again; if it keeps failing, contact privacy support.');
    }
    setUser(null);
    setAuthProvider(null);
  }, [user]);

  const reauthenticate = useCallback(
    async (password?: string) => {
      if (!user) throw new Error('You are signed out. Please sign in again.');
      // Re-running the sign-in flow reissues the session cookie with a fresh iat, which is what
      // the backend's recent-login check on account deletion looks at.
      if (authProvider === 'password') {
        if (!password || !user.email) throw new Error('Enter your password.');
        applyBackendUser(await AuthService.signInWithEmail(user.email, password));
      } else {
        applyBackendUser(await AuthService.signInWithGoogle());
      }
    },
    [user, authProvider]
  );

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        authModalOpen,
        setAuthModalOpen,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        emailVerified,
        resendVerification,
        refreshEmailVerified,
        giveAdultConsent,
        giveMinorConsent,
        requestParentConsent,
        signOut,
        signOutAllDevices,
        updateSettings,
        applyReferralCode,
        updateProfile,
        recordStudyActivity,
        deleteAccount,
        reauthProviderId: authProvider,
        reauthenticate,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
