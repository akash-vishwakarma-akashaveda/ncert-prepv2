import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isFirebaseConfigured } from '../../services/firebase';
import { NOTICE, NoticeLang } from '../../data/privacyNotice';

export const NoticeView: React.FC<{ lang: NoticeLang; onLang?: (l: NoticeLang) => void; compact?: boolean }> = ({ lang, onLang, compact }) => {
  const n = NOTICE[lang];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg text-[#1E2233]">{n.title}</h3>
        {onLang && (
          <div role="radiogroup" aria-label="Notice language" className="flex p-1 gap-1 rounded-xl bg-[color:var(--page)] border-2 border-[#E3E5EC]">
            {(['en', 'hi'] as const).map((l) => (
              <button
                key={l}
                role="radio"
                aria-checked={lang === l}
                onClick={() => onLang(l)}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer ${lang === l ? 'bg-white text-[color:var(--brand)] shadow-[0_2px_0_#E3E5EC]' : 'text-[#6B7280]'}`}
              >
                {l === 'en' ? 'English' : 'हिन्दी'}
              </button>
            ))}
          </div>
        )}
      </div>
      <div lang={lang} className={`${compact ? 'max-h-[34vh]' : ''} overflow-y-auto rounded-[18px] bg-[#F7F8FC] border-2 border-[color:var(--card-line)] p-4 space-y-3 text-[12.5px] leading-relaxed text-[#4B5168]`}>
        <p className="font-semibold">{n.intro}</p>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10.5px] tracking-[0.06em] text-[#9AA1B4]">
              <th className="pb-1 pr-3 font-extrabold">{lang === 'en' ? 'DATA' : 'डेटा'}</th>
              <th className="pb-1 font-extrabold">{lang === 'en' ? 'WHY' : 'क्यों'}</th>
            </tr>
          </thead>
          <tbody>
            {n.items.map((i) => (
              <tr key={i.data} className="align-top border-t border-[color:var(--card-line)]">
                <td className="py-1.5 pr-3 font-bold text-[#1E2233]">{i.data}</td>
                <td className="py-1.5 font-semibold">{i.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="list-disc pl-5 space-y-1 font-semibold">
          {n.rights.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="font-bold text-[#1E2233]">{n.children}</p>
        <p className="font-semibold">{n.withdraw}</p>
        <p className="font-semibold">{n.grievance}</p>
        <p className="font-semibold">{n.board}</p>
      </div>
    </div>
  );
};

const Shell: React.FC<{ icon: React.ReactNode; title: string; body: string; children: React.ReactNode }> = ({ icon, title, body, children }) => (
  <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[color:var(--brand-soft)] to-[color:var(--page)]">
    <div className="w-full max-w-[620px] bg-white rounded-[32px] border-[3px] border-[color:var(--card-line)] shadow-[0_8px_0_#E3E5EC] p-6 sm:p-8 space-y-4 animate-pop-soft">
      <span className="w-12 h-12 rounded-[16px] bg-[#12A594] shadow-[0_4px_0_#0B7A67] text-white flex items-center justify-center">{icon}</span>
      <div className="space-y-1.5">
        <h1 className="text-[26px] leading-tight text-[#1E2233]">{title}</h1>
        <p className="text-[13.5px] font-semibold leading-relaxed text-[#6B7280]">{body}</p>
      </div>
      {children}
    </div>
  </div>
);

const primary = 'btn-3d [--edge:#0B7A67] px-6 py-3 rounded-2xl bg-[#12A594] hover:bg-[#10988A] text-white text-sm font-extrabold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const quiet = 'px-4 py-3 rounded-2xl text-[13px] font-extrabold text-[#6B7280] hover:text-[#1E2233] cursor-pointer';
const input = 'w-full px-4 py-3 text-sm font-bold border-2 border-[#E3E5EC] rounded-2xl bg-[#F7F8FC] focus:bg-white focus:border-[color:var(--brand)] outline-none';

/**
 * DPDP Act 2023: nothing in the app runs for a signed-in account until
 *   1. an email/password account has verified its email, and
 *   2. consent is recorded: by the user if 18+, or by a parent/lawful guardian if under 18 (s.9).
 * Declining is as easy as agreeing: it erases the account.
 */
export const ConsentGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user, emailVerified, resendVerification, refreshEmailVerified, giveAdultConsent, requestParentConsent,
    simulateParentApproval, signOut, deleteAccount,
  } = useAuth();
  const [lang, setLang] = useState<NoticeLang>(user?.consent?.language || 'en');
  const [age, setAge] = useState<'adult' | 'child' | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);

  if (!user) return null;
  if (emailVerified && user.consent?.status === 'granted') return <>{children}</>;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const decline = () =>
    window.confirm('Delete this account and everything linked to it? You can register again later.') &&
    run(async () => {
      try {
        await deleteAccount();
      } catch (err) {
        if ((err as Error).message === 'requires-recent-login') {
          await signOut();
          return;
        }
        throw err;
      }
    });
  const footer = (
    <div className="flex flex-wrap items-center gap-1 pt-1 border-t-2 border-[color:var(--card-line)]">
      <button onClick={() => run(signOut)} className={quiet}>Sign out</button>
      <button onClick={decline} className={`${quiet} hover:text-[#C24A2C]`}>Delete this account</button>
    </div>
  );
  const alerts = (
    <>
      {error && (
        <p role="alert" className="p-3 text-xs font-bold text-[#8A2E17] bg-[#FFE9E2] border-2 border-[#FFC3B1] rounded-[14px] flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </p>
      )}
      {info && (
        <p role="status" className="p-3 text-xs font-bold text-[#0B5E50] bg-[#E7F7F1] border-2 border-[#A9E6D3] rounded-[14px] flex gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {info}
        </p>
      )}
    </>
  );

  if (!emailVerified) {
    return (
      <Shell icon={<Mail className="w-6 h-6" />} title="Verify your email" body={`We sent a link to ${user.email}. Click it, then come back here. Check your spam folder if you can't see it.`}>
        {alerts}
        <div className="flex flex-wrap gap-2.5">
          <button
            disabled={busy}
            onClick={() => run(async () => { if (!(await refreshEmailVerified())) setError("Not verified yet. Click the link in the email first."); })}
            className={primary}
          >
            I've verified my email
          </button>
          <button disabled={busy} onClick={() => run(async () => { await resendVerification(); setInfo('A new link is on its way.'); })} className={quiet}>
            Send the link again
          </button>
        </div>
        {footer}
      </Shell>
    );
  }

  if (user.consent?.status === 'pending_parent' && !changing) {
    return (
      <Shell
        icon={<Clock className="w-6 h-6" />}
        title="Waiting for your parent or guardian"
        body={`We emailed ${user.consent.parent_name} at ${user.consent.parent_email}. As soon as they approve, your account opens. The link is valid for 7 days.`}
      >
        {alerts}
        <div className="rounded-[18px] bg-[#FFF6E2] border-2 border-[#FFD97A] p-4 text-[13px] font-semibold text-[#8A5A14] space-y-1">
          <p>Ask them to open the email from NCERT Prep and sign in with that same email address.</p>
          <p>Until they decide, we don't use any of your data. If nobody approves within 30 days, the account is deleted.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            disabled={busy}
            onClick={() => run(async () => { await requestParentConsent(user.consent!.parent_name || '', user.consent!.parent_email || '', lang); setInfo('We sent the email again.'); })}
            className={primary}
          >
            Send the email again
          </button>
          <button onClick={() => { setChanging(true); setAge('child'); setParentName(user.consent?.parent_name || ''); }} className={quiet}>
            Use a different email
          </button>
          {!isFirebaseConfigured && (
            <button onClick={() => run(simulateParentApproval)} className={`${quiet} text-[color:var(--brand)]`}>
              Demo: approve as parent
            </button>
          )}
        </div>
        {footer}
      </Shell>
    );
  }

  return (
    <Shell icon={<ShieldCheck className="w-6 h-6" />} title="Before we start" body="Please read how we use your data, then tell us your age.">
      <NoticeView lang={lang} onLang={setLang} compact />

      <fieldset className="space-y-2">
        <legend className="text-xs font-extrabold text-[#1E2233] mb-1.5">{lang === 'en' ? 'How old are you?' : 'आपकी उम्र क्या है?'}</legend>
        <div className="grid grid-cols-2 gap-2.5">
          {([
            ['adult', lang === 'en' ? 'I am 18 or older' : 'मेरी उम्र 18 या अधिक है'],
            ['child', lang === 'en' ? 'I am under 18' : 'मेरी उम्र 18 से कम है'],
          ] as const).map(([value, text]) => (
            <button
              key={value}
              type="button"
              aria-pressed={age === value}
              onClick={() => { setAge(value); setAgreed(false); setError(null); }}
              className={`p-3.5 rounded-[18px] border-[3px] text-[13px] font-extrabold cursor-pointer ${
                age === value ? 'bg-[color:var(--brand)] border-[color:var(--brand-edge)] text-white' : 'bg-white border-[#E3E5EC] text-[#4B5168] hover:border-[color:var(--brand-line)]'
              }`}
            >
              {text}
            </button>
          ))}
        </div>
      </fieldset>

      {alerts}

      {age === 'adult' && (
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[#F7F8FC] border-2 border-[#E3E5EC] cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 w-5 h-5 accent-[#12A594] shrink-0" />
            <span className="text-[13px] font-bold text-[#1E2233]">
              {lang === 'en'
                ? 'I have read the privacy notice. I agree that NCERT Prep may use my data for the purposes listed above.'
                : 'मैंने गोपनीयता सूचना पढ़ ली है। मैं सहमत हूँ कि NCERT Prep ऊपर बताए गए कामों के लिए मेरे डेटा का उपयोग कर सकता है।'}
            </span>
          </label>
          <div className="flex flex-wrap gap-2.5">
            <button disabled={!agreed || busy} onClick={() => run(() => giveAdultConsent(lang))} className={primary}>
              {busy ? 'Saving…' : lang === 'en' ? 'I agree, continue' : 'सहमत हूँ, आगे बढ़ें'}
            </button>
            <button onClick={decline} className={quiet}>
              {lang === 'en' ? "I don't agree, delete my account" : 'सहमत नहीं, मेरा खाता हटाएँ'}
            </button>
          </div>
        </div>
      )}

      {age === 'child' && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await requestParentConsent(parentName.trim(), parentEmail.trim(), lang);
              setChanging(false);
            });
          }}
        >
          <p className="text-[13px] font-semibold text-[#4B5168]">
            {lang === 'en'
              ? "The law requires your parent or guardian to approve before we use your data. We'll email them a link; nothing else happens until they decide."
              : 'कानून के अनुसार आपके डेटा का उपयोग करने से पहले माता-पिता या अभिभावक की स्वीकृति ज़रूरी है। हम उन्हें एक लिंक ईमेल करेंगे; उनके निर्णय तक कुछ और नहीं होगा।'}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="parent-name" className="block text-xs font-extrabold text-[#1E2233] mb-1.5">{lang === 'en' ? "Parent or guardian's name" : 'माता-पिता/अभिभावक का नाम'}</label>
              <input id="parent-name" value={parentName} onChange={(e) => setParentName(e.target.value)} maxLength={80} className={input} required />
            </div>
            <div>
              <label htmlFor="parent-email" className="block text-xs font-extrabold text-[#1E2233] mb-1.5">{lang === 'en' ? 'Their email address' : 'उनका ईमेल पता'}</label>
              <input id="parent-email" type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} className={input} required />
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button type="submit" disabled={busy || !parentName.trim() || !parentEmail.trim()} className={primary}>
              {busy ? 'Sending…' : lang === 'en' ? 'Email my parent' : 'माता-पिता को ईमेल भेजें'}
            </button>
            {changing && (
              <button type="button" onClick={() => setChanging(false)} className={quiet}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
      {footer}
    </Shell>
  );
};
