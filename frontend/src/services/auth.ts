import { api, ApiError } from './api/client';
import { User, UserConsent } from '../types';
import { normalizeClassSort } from '../data/classFormat';

export interface BackendUser {
  id: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  phoneNumber: string | null;
  role: 'STUDENT' | 'ADMIN';
  referralCode: string | null;
  classGrade: number | null;
  xp: number;
  streak: number;
  lastActiveDate: string | null;
  lastWatchedVideo: string | null;
  studyGoalMinutes: number | null;
  onboardingCompleted: boolean;
  focusSubjects: string[];
  stream: string | null;
  remindersEnabled: boolean;
  reminderFrequency: 'daily' | 'weekly';
  reminderHour: number | null;
  emailVerified: boolean;
  provider: 'password' | 'google.com';
  consent?: {
    status: 'granted' | 'pending_parent';
    age_group: string | null;
    method: string | null;
    notice_version: string | null;
    language: string | null;
    parent_name: string | null;
    parent_email: string | null;
    granted_at: string | null;
    requested_at: string | null;
  };
  createdAt: string;
}

export function toFrontendUser(u: BackendUser): User {
  return {
    userId: u.id,
    email: u.email,
    displayName: u.displayName ?? undefined,
    photoURL: u.photoUrl ?? undefined,
    phoneNumber: u.phoneNumber ?? undefined,
    role: u.role === 'ADMIN' ? 'admin' : 'student',
    referral_code: u.referralCode,
    grade_preference: u.classGrade != null ? normalizeClassSort(u.classGrade) : undefined,
    study_goal_minutes: u.studyGoalMinutes ?? undefined,
    streak_days: u.streak,
    last_active_date: u.lastActiveDate ?? undefined,
    reminders_enabled: u.remindersEnabled,
    reminder_frequency: u.reminderFrequency,
    reminder_hour: u.reminderHour ?? undefined,
    last_watched_video: u.lastWatchedVideo ?? null,
    onboarding_completed: u.onboardingCompleted,
    focus_subjects: u.focusSubjects,
    stream: u.stream ?? null,
    xp: u.xp,
    created_at: u.createdAt,
    consent: u.consent as UserConsent | undefined,
  };
}

// ---- Google Identity Services: loaded on demand, no build-time dependency ----

// The OAuth popup flow, not One Tap. One Tap can only offer accounts the browser already has a
// Google session for, so it fails outright for anyone signed out of Google or browsing privately:
// "Provider's accounts list is empty" -> FedCM NetworkError -> "cancelled or blocked". The popup
// lets the user sign into Google as part of signing in here, and it can be opened from a click,
// which the reauthentication-before-account-deletion path needs.

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}

interface GoogleTokenClient {
  requestAccessToken: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: { type: string }) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

const POPUP_BLOCKED_MESSAGE =
  'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again — or sign in with email below.';

let gsiScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!gsiScriptPromise) {
    gsiScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
      document.head.appendChild(script);
    });
  }
  return gsiScriptPromise;
}

/** Fetch Google's script ahead of the click, so opening the popup stays inside the user gesture. */
export function preloadGoogleSignIn(): void {
  void loadGoogleIdentityScript().catch(() => {});
}

async function getGoogleAccessToken(): Promise<string> {
  await loadGoogleIdentityScript();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!clientId) throw new Error('Google sign-in is not configured (VITE_GOOGLE_CLIENT_ID missing).');

  return new Promise((resolve, reject) => {
    window.google!.accounts.oauth2
      .initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: (response) => {
          if (response.access_token) resolve(response.access_token);
          else reject(new Error('Google sign-in was cancelled.'));
        },
        error_callback: (error) => {
          reject(new Error(error.type === 'popup_failed_to_open' ? POPUP_BLOCKED_MESSAGE : 'Google sign-in was cancelled.'));
        },
      })
      .requestAccessToken();
  });
}

// ---- Backend calls ----

export const AuthService = {
  async signInWithGoogle(): Promise<BackendUser> {
    const accessToken = await getGoogleAccessToken();
    return api.post<BackendUser>('/api/auth/google', { accessToken });
  },
  signInWithEmail: (email: string, password: string) => api.post<BackendUser>('/api/auth/login', { email, password }),
  signUpWithEmail: (name: string, email: string, password: string, referralCode?: string) =>
    api.post<BackendUser>('/api/auth/register', { email, password, displayName: name, referralCode: referralCode || undefined }),
  sendPasswordReset: (email: string) => api.post<{ ok: true }>('/api/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post<{ ok: true }>('/api/auth/reset-password', { token, password }),
  resendVerification: () => api.post<{ ok: true }>('/api/auth/resend-verification'),
  verifyEmail: (token: string) => api.post<{ ok: true }>('/api/auth/verify-email', { token }),
  signOut: () => api.post<{ ok: true }>('/api/auth/logout'),
  signOutAllDevices: () => api.post<{ ok: true }>('/api/auth/logout-all'),

  async me(): Promise<BackendUser | null> {
    try {
      return await api.get<BackendUser>('/api/auth/me');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },

  updateProfile: (updates: Record<string, unknown>) => api.patch<BackendUser>('/api/users/me/profile', updates),
  updateSettings: (settings: Record<string, unknown>) => api.patch<BackendUser>('/api/users/me/settings', settings),
  giveAdultConsent: (language: string) => api.post<BackendUser>('/api/users/me/consent/adult', { language }),
  requestParentConsent: (parentName: string, parentEmail: string, language: string) =>
    api.post<{ parentEmail: string }>('/api/users/me/consent/parent-request', { parentName, parentEmail, language }),
  deleteAccount: () => api.delete<{ ok: true }>('/api/users/me'),
};

export { ApiError };
