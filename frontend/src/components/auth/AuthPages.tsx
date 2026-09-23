import React, { useState } from 'react';
import { X, AlertCircle, Shield, Sparkles, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { LogoMark } from '../common/Logo';
import { useAuth } from '../../context/AuthContext';
import { isFirebaseConfigured } from '../../services/firebase';

interface AuthPagesProps {
  onSuccess?: () => void;
  isModal?: boolean;
}

type Mode = 'choose' | 'signin' | 'signup' | 'forgot';

// Popup closed or cancelled by the user: not an error worth showing.
const QUIET_CODES = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
const MESSAGES: Record<string, string> = {
  'auth/popup-blocked': 'Your browser blocked the Google window. Allow pop-ups for this site and try again.',
  'auth/network-request-failed': 'No internet connection. Check your network and try again.',
  'auth/unauthorized-domain': 'This website is not yet allowed for sign-in. Please contact support.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead, or reset your password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/weak-password': 'Use at least 8 characters for your password.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
};

function friendlyError(err: unknown): string | null {
  const code = (err as { code?: string })?.code || '';
  if (QUIET_CODES.includes(code)) return null;
  return MESSAGES[code] || (err as Error)?.message || 'Sign-in did not complete. Please try again.';
}

const input =
  'w-full px-4 py-3 text-sm font-bold border-2 border-[#E3E5EC] rounded-2xl bg-[#F7F8FC] focus:bg-white focus:border-[color:var(--brand)] outline-none';
const label = 'block text-xs font-extrabold text-[#1E2233] mb-1.5';

const GoogleMark = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.97 10.97 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
  </svg>
);

/**
 * Sign-in / registration through Firebase Auth: Google, or email + password.
 * The DPDP notice and consent (with parental consent for under-18s) follow immediately after,
 * in the ConsentGate, before any other data is processed.
 */
export const AuthPages: React.FC<AuthPagesProps> = ({ onSuccess, isModal = true }) => {
  const { authModalOpen, setAuthModalOpen, signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset, signInDemo } = useAuth();
  const [mode, setMode] = useState<Mode>('choose');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (isModal && !authModalOpen) return null;

  const go = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };
  const close = () => {
    go('choose');
    setPassword('');
    setAuthModalOpen(false);
  };

  const run = async (action: () => Promise<void>) => {
    setSubmitting(true);
    setError(null);
    try {
      await action();
      onSuccess?.();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signin') return run(() => signInWithEmail(email, password));
    if (mode === 'signup') {
      if (name.trim().length < 2) return setError('Enter your name.');
      if (password.length < 8) return setError('Use at least 8 characters for your password.');
      return run(() => signUpWithEmail(name, email, password));
    }
    if (mode === 'forgot') {
      return run(async () => {
        await sendPasswordReset(email);
        setInfo('If an account exists for this email, a reset link is on its way. Check your inbox and spam folder.');
      });
    }
  };

  const titles: Record<Mode, [string, string]> = {
    choose: ['Welcome to NCERT Prep', 'Sign in or create your free account to keep your progress, streak and saved lessons on every device.'],
    signin: ['Sign in with email', 'Use the email and password you registered with.'],
    signup: ['Create your account', "We'll email you a link to verify your address. Next, you'll see our privacy notice and give consent."],
    forgot: ['Reset your password', "Enter your account's email and we'll send you a reset link."],
  };

  const content = (
    <div className="relative w-full max-w-[440px] max-h-[92vh] overflow-y-auto bg-white rounded-[32px] border-[3px] border-[color:var(--card-line)] shadow-[0_8px_0_#E3E5EC] p-6 sm:p-[30px] flex flex-col gap-4 animate-pop-soft">
      {isModal && (
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-5 top-5 w-9 h-9 flex items-center justify-center text-[#6B7280] hover:text-[#1E2233] bg-[color:var(--page)] border-2 border-[#E3E5EC] rounded-xl cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {mode === 'choose' ? (
        <LogoMark className="w-[52px] h-[52px]" />
      ) : (
        <button onClick={() => go(mode === 'forgot' ? 'signin' : 'choose')} className="self-start inline-flex items-center gap-1 text-xs font-extrabold text-[#6B7280] hover:text-[#1E2233] cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      )}
      <div className="space-y-1.5 pr-8">
        <h2 className="text-[27px] leading-tight text-[#1E2233]">{titles[mode][0]}</h2>
        <p className="text-[13px] font-semibold leading-relaxed text-[#6B7280]">{titles[mode][1]}</p>
      </div>

      {error && (
        <p role="alert" className="p-3 text-xs font-bold text-[#8A2E17] bg-[#FFE9E2] border-2 border-[#FFC3B1] rounded-[14px] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </p>
      )}
      {info && (
        <p role="status" className="p-3 text-xs font-bold text-[#0B5E50] bg-[#E7F7F1] border-2 border-[#A9E6D3] rounded-[14px] flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> {info}
        </p>
      )}

      {mode === 'choose' ? (
        <>
          <button
            onClick={() => run(signInWithGoogle)}
            disabled={submitting}
            className="btn-3d [--edge:#E3E5EC] w-full flex items-center justify-center gap-3 p-3.5 rounded-2xl bg-white border-[3px] border-[#E3E5EC] hover:bg-[#F7F8FC] text-sm font-extrabold text-[#1E2233] cursor-pointer disabled:opacity-60"
          >
            <GoogleMark />
            {submitting ? 'Opening Google…' : 'Continue with Google'}
          </button>
          <div className="flex items-center gap-3 text-[11px] font-extrabold text-[#9AA1B4]">
            <span className="flex-1 border-t-2 border-[color:var(--card-line)]" /> OR <span className="flex-1 border-t-2 border-[color:var(--card-line)]" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={() => go('signup')} className="btn-3d [--edge:var(--brand-edge)] flex items-center justify-center gap-2 p-3 rounded-2xl bg-[color:var(--brand)] text-white text-[13px] font-extrabold cursor-pointer">
              <Mail className="w-4 h-4" /> Register with email
            </button>
            <button onClick={() => go('signin')} className="flex items-center justify-center p-3 rounded-2xl bg-[color:var(--brand-soft)] border-2 border-[color:var(--brand-line)] text-[color:var(--brand)] text-[13px] font-extrabold cursor-pointer">
              Sign in with email
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={submit} className="space-y-3.5" noValidate>
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-name" className={label}>Your name</label>
              <input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} className={input} required />
            </div>
          )}
          <div>
            <label htmlFor="auth-email" className={label}>Email address</label>
            <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={input} required />
          </div>
          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="auth-password" className="text-xs font-extrabold text-[#1E2233]">Password</label>
                {mode === 'signin' && (
                  <button type="button" onClick={() => go('forgot')} className="text-[11.5px] font-extrabold text-[color:var(--brand)] cursor-pointer">
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={mode === 'signup' ? 8 : undefined}
                className={input}
                required
              />
              {mode === 'signup' && <p className="mt-1 text-[11px] font-semibold text-[#6B7280]">At least 8 characters.</p>}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || !email || (mode !== 'forgot' && !password)}
            className="btn-3d [--edge:var(--brand-edge)] w-full p-3.5 rounded-2xl bg-[color:var(--brand)] hover:bg-[color:var(--brand-hover)] text-white text-sm font-extrabold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'signin' ? 'Sign in' : 'Send reset link'}
          </button>
          {mode !== 'forgot' && (
            <p className="text-center text-xs font-bold text-[#6B7280]">
              {mode === 'signin' ? 'New here? ' : 'Already registered? '}
              <button type="button" onClick={() => go(mode === 'signin' ? 'signup' : 'signin')} className="font-extrabold text-[color:var(--brand)] cursor-pointer">
                {mode === 'signin' ? 'Create an account' : 'Sign in'}
              </button>
            </p>
          )}
        </form>
      )}

      {!isFirebaseConfigured && mode === 'choose' && (
        <div className="rounded-[18px] bg-[#FFF6E2] border-2 border-dashed border-[#FFD97A] p-3.5 space-y-2.5">
          <p className="text-[11.5px] font-bold text-[#8A5A14]">Development mode: no Firebase keys, so accounts live only in this browser.</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => run(() => signInDemo('aarav.sharma@ncertprep.demo', 'Aarav Sharma', 'student'))}
              disabled={submitting}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-[14px] bg-white border-2 border-[#E3E5EC] text-xs font-extrabold text-[#1E2233] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[color:var(--brand)]" /> Demo student
            </button>
            <button
              onClick={() => run(() => signInDemo('admin@ncertprep.demo', 'Demo Admin', 'admin'))}
              disabled={submitting}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-[14px] bg-[#1E2233] text-xs font-extrabold text-white cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" /> Demo admin
            </button>
          </div>
        </div>
      )}

      <p className="text-[11px] font-semibold leading-relaxed text-[#9AA1B4] text-center">
        Before we use any of your data you'll see our{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[color:var(--brand)]">
          privacy notice
        </a>{' '}
        and choose whether to consent. Under 18? A parent or guardian must approve.
      </p>
    </div>
  );

  if (!isModal) return <div className="flex justify-center p-4">{content}</div>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E2233]/50 backdrop-blur-xs" role="dialog" aria-modal="true" aria-label="Sign in" onClick={close}>
      <div className="w-full max-w-[440px]" onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
};
