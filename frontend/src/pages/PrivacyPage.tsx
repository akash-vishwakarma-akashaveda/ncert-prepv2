import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { Breadcrumbs } from '../components/navigation/Breadcrumbs';
import { NoticeView } from '../components/consent/ConsentGate';
import { GRIEVANCE, NOTICE_VERSION, NoticeLang } from '../data/privacyNotice';

interface PrivacyPageProps {
  onNavigateHome: () => void;
}

const MORE: [string, string][] = [
  [
    'How consent works',
    'We ask for consent right after you sign in, before using any other data. Adults consent themselves. For anyone under 18 we email the parent or guardian they name; that adult must sign in with that email, confirm they are the parent or lawful guardian and 18+, and approve. Until then the account cannot be used. If nobody approves within 30 days, the account is deleted.',
  ],
  [
    'Sign-in',
    'You can sign in with Google or with an email address and password (Firebase Authentication). We never see your Google password. Email accounts must verify their address.',
  ],
  [
    'Children',
    'We do not track children, profile their behaviour or show them advertising. A child’s browser is never linked to their account in our visitor counts.',
  ],
  [
    'Videos',
    'Lessons play from YouTube’s privacy-enhanced domain (youtube-nocookie.com) without recommendations. We never access your YouTube account.',
  ],
  ['Reminder emails', 'Off unless you turn them on. Every email has a one-click unsubscribe link.'],
  [
    'Storage and security',
    'Data is stored in Google Firebase (Firestore) with access rules so that only you, and our teachers for your doubts, can see your data. We keep it until you withdraw consent or delete your account; it is then erased within 30 days.',
  ],
  ['Changes', 'If this notice changes in a way that needs your consent again, we will ask you the next time you sign in.'],
];

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onNavigateHome }) => {
  const [lang, setLang] = useState<NoticeLang>('en');
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <Breadcrumbs
        items={[
          { label: 'Home', onClick: onNavigateHome },
          { label: 'Privacy', active: true },
        ]}
      />

      <div className="bg-white border-[3px] border-[#EDEFF6] rounded-[26px] p-6 sm:p-8 space-y-3">
        <span className="w-12 h-12 rounded-[16px] bg-[#3B4FE0] shadow-[0_4px_0_#2A3BB8] text-white flex items-center justify-center">
          <Shield className="w-6 h-6" />
        </span>
        <h1 className="text-[28px] sm:text-[32px] leading-tight text-[#1E2233]">Privacy notice</h1>
        <p className="text-xs font-bold text-[#6B7280]">
          Notice version {NOTICE_VERSION} · Digital Personal Data Protection Act, 2023 · Available in English and हिन्दी
        </p>
      </div>

      <div className="bg-white border-[3px] border-[#EDEFF6] rounded-[26px] p-5 sm:p-6">
        <NoticeView lang={lang} onLang={setLang} />
      </div>

      <div className="bg-white border-[3px] border-[#EDEFF6] rounded-[26px] p-5 sm:p-6 space-y-4">
        {MORE.map(([title, body]) => (
          <section key={title} className="space-y-1">
            <h2 className="text-lg text-[#1E2233]">{title}</h2>
            <p className="text-[13px] font-semibold leading-relaxed text-[#4B5168]">{body}</p>
          </section>
        ))}
        <section className="space-y-1 pt-3 border-t-2 border-[#EDEFF6]">
          <h2 className="text-lg text-[#1E2233]">Grievance Officer</h2>
          <p className="text-[13px] font-semibold text-[#4B5168]">
            {GRIEVANCE.name} ·{' '}
            <a href={`mailto:${GRIEVANCE.email}`} className="font-extrabold text-[#3B4FE0]">
              {GRIEVANCE.email}
            </a>{' '}
            · reply within 30 days. You can also complain to the Data Protection Board of India.
          </p>
        </section>
      </div>
    </div>
  );
};
