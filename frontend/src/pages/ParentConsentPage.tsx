import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { functions, isFirebaseConfigured } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { NoticeView } from '../components/consent/ConsentGate';
import { NoticeLang } from '../data/privacyNotice';

interface RequestInfo {
  childName: string;
  parentEmail: string;
  status: 'pending' | 'approved' | 'refused' | 'expired' | 'superseded';
}

const DONE: Record<string, [string, string]> = {
  approved: ['Approved. Thank you!', 'The account is now active. You can withdraw consent any time by writing to our Grievance Officer (see the notice).'],
  refused: ['Request refused', 'The account and all its data have been deleted.'],
  expired: ['This link has expired', 'Ask your child to send a new request from their account.'],
  superseded: ['This link was replaced', 'Your child sent a newer request. Please use the most recent email.'],
};

/**
 * DPDP s.9 verifiable parental consent. The parent must sign in with the exact (verified) email
 * the request was sent to, read the notice, declare they are the parent/lawful guardian and 18+,
 * then approve or refuse. The server (decideParentalConsent) re-checks every condition.
 */
export const ParentConsentPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { user, setAuthModalOpen, emailVerified, refreshEmailVerified, resendVerification } = useAuth();
  const [req, setReq] = useState<RequestInfo | null>(null);
  const [lang, setLang] = useState<NoticeLang>('en');
  const [guardian, setGuardian] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !functions) return;
    httpsCallable<{ token: string }, RequestInfo>(functions, 'getParentalConsentRequest')({ token })
      .then((r) => setReq(r.data))
      .catch((err) => setError((err as Error).message || 'This link is not valid.'));
  }, [token]);

  const decide = async (decision: 'approve' | 'refuse') => {
    if (decision === 'refuse' && !window.confirm(`Refuse and delete ${req?.childName}'s account and data?`)) return;
    setBusy(true);
    setError(null);
    try {
      if (!emailVerified && !(await refreshEmailVerified())) throw new Error('Verify your email address first (check your inbox), then try again.');
      const res = await httpsCallable<unknown, { status: RequestInfo['status'] }>(functions!, 'decideParentalConsent')({
        token,
        decision,
        declaredGuardian: guardian,
        agreed,
        language: lang,
      });
      setReq((r) => (r ? { ...r, status: res.data.status } : r));
    } catch (err) {
      setError((err as Error).message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const box = 'max-w-[720px] mx-auto my-6 sm:my-10 bg-white rounded-[32px] border-[3px] border-[#EDEFF6] shadow-[0_8px_0_#E3E5EC] p-6 sm:p-8 space-y-5';

  if (!isFirebaseConfigured) {
    return (
      <div className={box}>
        <h1 className="text-[26px]">Parent approval</h1>
        <p className="text-sm font-semibold text-[#6B7280]">
          Development mode has no email. Approve from the child's "Waiting for your parent" screen with the demo button.
        </p>
      </div>
    );
  }

  const done = req && req.status !== 'pending' ? DONE[req.status] : null;

  return (
    <div className={box}>
      <span className="w-12 h-12 rounded-[16px] bg-[#12A594] shadow-[0_4px_0_#0B7A67] text-white flex items-center justify-center">
        <ShieldCheck className="w-6 h-6" />
      </span>
      <div className="space-y-1.5">
        <h1 className="text-[26px] leading-tight">
          {done ? done[0] : req ? `${req.childName} needs your permission` : 'Parent or guardian approval'}
        </h1>
        <p className="text-[13.5px] font-semibold leading-relaxed text-[#6B7280]">
          {done
            ? done[1]
            : "India's Digital Personal Data Protection Act, 2023 requires a parent's or lawful guardian's consent before we use the data of anyone under 18. Please read the notice and decide."}
        </p>
      </div>

      {error && (
        <p role="alert" className="p-3 text-xs font-bold text-[#8A2E17] bg-[#FFE9E2] border-2 border-[#FFC3B1] rounded-[14px] flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </p>
      )}

      {done && (
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-extrabold text-[#3B4FE0]">
          <CheckCircle2 className="w-4 h-4" /> Go to NCERT Prep
        </Link>
      )}

      {req?.status === 'pending' && (
        <>
          <NoticeView lang={lang} onLang={setLang} />

          {!user ? (
            <div className="rounded-[18px] bg-[#EEF0FE] border-2 border-[#C7CDF8] p-4 space-y-3">
              <p className="text-[13px] font-bold text-[#1E2233]">
                To confirm it's you, sign in with <span className="text-[#3B4FE0]">{req.parentEmail}</span> (Google, or register with that email).
              </p>
              <button onClick={() => setAuthModalOpen(true)} className="btn-3d [--edge:#2A3BB8] px-6 py-3 rounded-2xl bg-[#3B4FE0] text-white text-sm font-extrabold cursor-pointer">
                Sign in to continue
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {!emailVerified && (
                <p className="p-3 text-xs font-bold text-[#8A5A14] bg-[#FFF6E2] border-2 border-[#FFD97A] rounded-[14px]">
                  We sent a verification link to {user.email}. Click it, then press Approve.{' '}
                  <button onClick={() => resendVerification()} className="underline cursor-pointer">Send again</button>
                </p>
              )}
              <p className="text-xs font-bold text-[#6B7280]">Signed in as {user.email}. It must match {req.parentEmail}.</p>
              {[
                [guardian, setGuardian, `I am ${req.childName}'s parent or lawful guardian, and I am 18 or older.`],
                [agreed, setAgreed, `I have read the notice and consent to NCERT Prep using ${req.childName}'s data for the purposes listed.`],
              ].map(([checked, set, text]) => (
                <label key={text as string} className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[#F7F8FC] border-2 border-[#E3E5EC] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked as boolean}
                    onChange={(e) => (set as (v: boolean) => void)(e.target.checked)}
                    className="mt-0.5 w-5 h-5 accent-[#12A594] shrink-0"
                  />
                  <span className="text-[13px] font-bold text-[#1E2233]">{text as string}</span>
                </label>
              ))}
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  disabled={busy || !guardian || !agreed}
                  onClick={() => decide('approve')}
                  className="btn-3d [--edge:#0B7A67] px-6 py-3 rounded-2xl bg-[#12A594] text-white text-sm font-extrabold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? 'Saving…' : 'Approve'}
                </button>
                <button disabled={busy} onClick={() => decide('refuse')} className="px-5 py-3 rounded-2xl bg-white border-2 border-[#FFC3B1] text-[#C24A2C] text-sm font-extrabold cursor-pointer">
                  Refuse and delete account
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {!req && !error && <div className="h-40 rounded-[22px] skeleton-shimmer" aria-label="Loading" />}
    </div>
  );
};
