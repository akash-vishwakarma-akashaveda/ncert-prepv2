import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthService, BackendUser, toFrontendUser } from '../services/auth';
import { ApiError } from '../services/api/client';
import { isFirebaseConfigured } from '../services/firebase';
import { FirestoreService } from '../services/firestore';
import { DoubtsService } from '../services/content';
import { StorageService } from '../services/storage';
import { User, UserConsent } from '../types';
import { NOTICE_VERSION, NoticeLang } from '../data/privacyNotice';
import { nextStreak } from '../data/gamification';
import { StatsService, bumpDemoStat } from '../services/stats';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDemoUser: boolean;
  isAdmin: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  // Google sign-in via Google Identity Services, or email + password (verified by email link),
  // both backed by our own API. A local browser-only demo account is available separately (signInDemo).
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  /** False only for email/password accounts that have not clicked the verification link yet. */
  emailVerified: boolean;
  resendVerification: () => Promise<void>;
  /** Re-reads verification state after the user clicks the link in their inbox. */
  refreshEmailVerified: () => Promise<boolean>;
  // DPDP consent (recorded server-side; demo mode stores it locally)
  giveAdultConsent: (language: NoticeLang) => Promise<void>;
  requestParentConsent: (parentName: string, parentEmail: string, language: NoticeLang) => Promise<string>;
  /** Demo mode only: stands in for the parent clicking "Approve". */
  simulateParentApproval: () => Promise<void>;
  /** Development only: local demo account, optionally as admin. */
  signInDemo: (email?: string, name?: string, role?: 'student' | 'admin', grade?: string) => Promise<void>;
  signOut: () => Promise<void>;
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
  if (updates.grade_preference !== undefined) out.classGrade = parseInt(updates.grade_preference, 10) || undefined;
  if (updates.study_goal_minutes !== undefined) out.studyGoalMinutes = updates.study_goal_minutes;
  if (updates.focus_subjects !== undefined) out.focusSubjects = updates.focus_subjects;
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
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [emailVerified, setEmailVerified] = useState<boolean>(true);
  const [authProvider, setAuthProvider] = useState<'password' | 'google.com' | null>(null);

  const applyBackendUser = (backendUser: BackendUser) => {
    setUser(toFrontendUser(backendUser));
    setEmailVerified(backendUser.emailVerified);
    setAuthProvider(backendUser.provider);
    setIsDemoUser(false);
  };

  // On load: ask the API if we have a session cookie. No session, and no backend configured for
  // this browser at all (VITE_FIREBASE_API_KEY unset, the legacy "zero-config" signal) -> restore
  // a local-only demo account if one was left in this browser.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const backendUser = await AuthService.me();
        if (cancelled) return;
        if (backendUser) {
          applyBackendUser(backendUser);
        } else if (!isFirebaseConfigured) {
          const localUser = StorageService.getLocalUser();
          if (localUser) {
            setUser(localUser);
            setIsDemoUser(true);
          }
        } else {
          StorageService.setLocalUser(null);
        }
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

  const signUpWithEmail = useCallback(async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const backendUser = await AuthService.signUpWithEmail(name.trim(), email.trim(), password);
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

  const saveDemoConsent = (consent: UserConsent) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, consent };
      StorageService.setLocalUser(next);
      return next;
    });
  };

  const giveAdultConsent = useCallback(
    async (language: NoticeLang) => {
      if (isDemoUser) {
        saveDemoConsent({ status: 'granted', age_group: 'adult', method: 'self', notice_version: NOTICE_VERSION, language, granted_at: Date.now() });
        return;
      }
      const backendUser = await AuthService.giveAdultConsent(language);
      applyBackendUser(backendUser);
    },
    [isDemoUser]
  );

  const requestParentConsent = useCallback(
    async (parentName: string, parentEmail: string, language: NoticeLang) => {
      if (isDemoUser) {
        saveDemoConsent({
          status: 'pending_parent', age_group: 'child', method: 'parent', notice_version: NOTICE_VERSION, language,
          parent_name: parentName, parent_email: parentEmail, requested_at: Date.now(),
        });
        return parentEmail;
      }
      const { parentEmail: sentTo } = await AuthService.requestParentConsent(parentName, parentEmail, language);
      const backendUser = await AuthService.me();
      if (backendUser) applyBackendUser(backendUser);
      return sentTo;
    },
    [isDemoUser]
  );

  const simulateParentApproval = useCallback(async () => {
    if (!isDemoUser) return;
    setUser((prev) => {
      if (!prev?.consent) return prev;
      const next = { ...prev, consent: { ...prev.consent, status: 'granted' as const, granted_at: Date.now() } };
      StorageService.setLocalUser(next);
      return next;
    });
  }, [isDemoUser]);

  const signInDemo = useCallback(async (
    email = 'student@example.com',
    name = 'Demo Student',
    role: 'student' | 'admin' = 'student',
    grade?: string
  ) => {
    setLoading(true);
    const demoId = 'demo-user-' + Math.random().toString(36).substring(2, 9);
    const demoUser = await FirestoreService.createOrGetUser(demoId, email, name, null);
    demoUser.role = role;
    if (grade) demoUser.grade_preference = grade;
    if (role === 'admin') demoUser.onboarding_completed = true;
    else bumpDemoStat('registrations');
    StorageService.setLocalUser(demoUser);
    setUser(demoUser);
    setIsDemoUser(true);
    setAuthModalOpen(false);
    setLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    if (!isDemoUser) {
      try {
        await AuthService.signOut();
      } catch (err) {
        console.warn('Sign out error:', err);
      }
    }
    if (user) StorageService.setLocalUser(null);
    setUser(null);
    setIsDemoUser(false);
    setAuthProvider(null);
    setLoading(false);
  }, [user, isDemoUser]);

  const updateSettings = useCallback(
    async (settings: Partial<Pick<User, 'reminders_enabled' | 'reminder_frequency' | 'reminder_hour'>>) => {
      if (!user) return;
      if (isDemoUser) {
        setUser((prev) => (prev ? { ...prev, ...settings } : null));
        return;
      }
      const backendUser = await AuthService.updateSettings(toBackendSettings(settings));
      applyBackendUser(backendUser);
    },
    [user, isDemoUser]
  );

  const updateProfile = useCallback(
    async (updates: Partial<Omit<User, 'role' | 'userId'>>) => {
      if (!user) return;
      if (isDemoUser) {
        setUser((prev) => (prev ? { ...prev, ...updates } : null));
        return;
      }
      const backendUser = await AuthService.updateProfile(toBackendProfileUpdate(updates));
      applyBackendUser(backendUser);
    },
    [user, isDemoUser]
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
    const uid = user.userId;

    if (isDemoUser) {
      await FirestoreService.deleteUserAccount(uid);
      DoubtsService.removeLocalForUser(uid);
    } else {
      try {
        await AuthService.deleteAccount();
      } catch (err) {
        if (err instanceof ApiError && err.message === 'requires-recent-login') throw new Error('requires-recent-login');
        throw new Error('We could not finish deleting your account. Please try again; if it keeps failing, contact privacy support.');
      }
    }

    StorageService.clearUserData(uid);
    setUser(null);
    setIsDemoUser(false);
    setAuthProvider(null);
  }, [user, isDemoUser]);

  const reauthProviderId = isDemoUser ? null : authProvider;

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
        isDemoUser,
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
        requestParentConsent,
        simulateParentApproval,
        signInDemo,
        signOut,
        updateSettings,
        updateProfile,
        recordStudyActivity,
        deleteAccount,
        reauthProviderId,
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
