import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, KeyRound, MailCheck } from 'lucide-react';
import { AuthService } from '../services/auth';
import { useAuth } from '../context/AuthContext';

// Landing pages for the links in the verification and password-reset emails
// (backend/src/routes/auth.ts builds them as FRONTEND_ORIGIN/verify-email?token=… and /reset-password?token=…).

const box = 'max-w-[480px] mx-auto my-6 sm:my-10 bg-white rounded-[32px] border-[3px] border-[#EDEFF6] shadow-[0_8px_0_#E3E5EC] p-6 sm:p-8 space-y-5';
const badge = 'w-12 h-12 rounded-[16px] bg-[#12A594] shadow-[0_4px_0_#0B7A67] text-white flex items-center justify-center';
const primary = 'btn-3d [--edge:#0B7A67] inline-flex px-6 py-3 rounded-2xl bg-[#12A594] text-white text-sm font-extrabold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const input = 'w-full px-4 py-3 text-sm font-bold border-2 border-[#E3E5EC] rounded-2xl bg-[#F7F8FC] focus:bg-white focus:border-[color:var(--brand)] outline-none';

const ErrorLine: React.FC<{ text: string }> = ({ text }) => (
  <p role="alert" className="p-3 text-xs font-bold text-[#8A2E17] bg-[#FFE9E2] border-2 border-[#FFC3B1] rounded-[14px] flex gap-2">
    <AlertCircle className="w-4 h-4 shrink-0" /> {text}
  </p>
);

export const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { user, refreshEmailVerified } = useAuth();
  const [state, setState] = useState<'working' | 'done' | 'failed'>('working');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    AuthService.verifyEmail(token)
      .then(() => {
        setState('done');
        void refreshEmailVerified().catch(() => {});
      })
      .catch(() => setState('failed'));
  }, [token, refreshEmailVerified]);

  return (
    <div className={box}>
      <span className={badge}>
        <MailCheck className="w-6 h-6" />
      </span>
      <h1 className="text-[26px] leading-tight">
        {state === 'working' ? 'Verifying your email…' : state === 'done' ? 'Email verified' : 'This link did not work'}
      </h1>
      {state === 'failed' && <ErrorLine text="The link is invalid or has expired (links last 24 hours). Sign in and use “Send again” for a fresh one." />}
      {state !== 'working' && (
        <Link to={user ? '/app' : '/'} className={primary}>
          <CheckCircle2 className="w-4 h-4 mr-2" /> {user ? 'Continue to NCERT Prep' : 'Go to NCERT Prep'}
        </Link>
      )}
    </div>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { setAuthModalOpen } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('Use at least 8 characters for your password.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    setError(null);
    try {
      await AuthService.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError((err as Error).message || 'Could not reset your password. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={box}>
      <span className={badge}>
        <KeyRound className="w-6 h-6" />
      </span>
      <h1 className="text-[26px] leading-tight">{done ? 'Password changed' : 'Choose a new password'}</h1>
      {error && <ErrorLine text={error} />}
      {done ? (
        <>
          <p className="text-[13.5px] font-semibold text-[#6B7280]">You have been signed out on every device. Sign in with your new password.</p>
          <button onClick={() => setAuthModalOpen(true)} className={primary}>
            Sign in
          </button>
        </>
      ) : (
        <form onSubmit={submit} className="space-y-3.5">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (8+ characters)" autoComplete="new-password" aria-label="New password" className={input} />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat new password" autoComplete="new-password" aria-label="Repeat new password" className={input} />
          <button type="submit" disabled={busy || !password || !confirm} className={primary}>
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      )}
    </div>
  );
};
