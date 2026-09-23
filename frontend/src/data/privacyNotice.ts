/**
 * DPDP Act 2023 s.5 notice, shown before consent (sign-up, parent approval) and on /privacy.
 * Keep NOTICE_VERSION in sync with functions/src/consent.ts; bump both when the notice changes
 * so that consent is asked again.
 */
export const NOTICE_VERSION = '2026-09';

export const GRIEVANCE = {
  name: import.meta.env.VITE_GRIEVANCE_OFFICER_NAME || 'Grievance Officer, NCERT Prep',
  email: import.meta.env.VITE_GRIEVANCE_EMAIL || 'privacy@ncertprep.io',
};

export type NoticeLang = 'en' | 'hi';

export interface Notice {
  title: string;
  intro: string;
  items: { data: string; why: string }[];
  rights: string[];
  children: string;
  withdraw: string;
  grievance: string;
  board: string;
}

export const NOTICE: Record<NoticeLang, Notice> = {
  en: {
    title: 'Privacy notice',
    intro: 'NCERT Prep is the Data Fiduciary for your personal data. We use only what is listed below, only for these purposes.',
    items: [
      { data: 'Name and email address (from Google or the form)', why: 'To create and secure your account and let you sign in.' },
      { data: 'Your class, chosen subjects and daily goal', why: 'To show the right lessons on your dashboard.' },
      { data: 'Lessons opened, completed and saved; streak', why: 'To save your progress across devices.' },
      { data: 'Doubts and feedback you write', why: 'So your teacher can reply to you.' },
      { data: 'Reminder choice and time (only if you turn it on)', why: 'To email you your next lesson.' },
      { data: 'Parent or guardian name and email (under 18 only)', why: 'To ask for and record their consent.' },
      { data: 'A random browser ID and the dates you visit', why: 'To count visitors in total numbers. Never linked to a child’s account.' },
    ],
    rights: [
      'See and download your data (Profile → Export my data).',
      'Correct your name, class and settings (Profile).',
      'Withdraw consent and erase your account at any time (Profile → Withdraw consent & delete). It is as easy as giving consent.',
      'Nominate someone to exercise these rights for you, by writing to the Grievance Officer.',
    ],
    children:
      'Anyone under 18 needs a parent or lawful guardian to approve the account before we use any of their data. We never track children or show them ads.',
    withdraw: 'Withdrawing consent stops all processing, and your data is erased within 30 days.',
    grievance: `Questions or complaints: ${GRIEVANCE.name}, ${GRIEVANCE.email}. We reply within 30 days.`,
    board: 'If you are not satisfied, you can complain to the Data Protection Board of India.',
  },
  hi: {
    title: 'गोपनीयता सूचना',
    intro: 'NCERT Prep आपके व्यक्तिगत डेटा का डेटा फ़िड्यूशियरी है। हम केवल नीचे बताया गया डेटा, केवल इन्हीं कामों के लिए उपयोग करते हैं।',
    items: [
      { data: 'नाम और ईमेल पता (Google से या फ़ॉर्म से)', why: 'आपका खाता बनाने, सुरक्षित रखने और साइन-इन के लिए।' },
      { data: 'आपकी कक्षा, चुने गए विषय और रोज़ का लक्ष्य', why: 'डैशबोर्ड पर सही पाठ दिखाने के लिए।' },
      { data: 'खोले, पूरे किए और सहेजे गए पाठ; स्ट्रीक', why: 'हर डिवाइस पर आपकी प्रगति सहेजने के लिए।' },
      { data: 'आपके प्रश्न (डाउट) और फ़ीडबैक', why: 'ताकि शिक्षक आपको जवाब दे सकें।' },
      { data: 'रिमाइंडर का विकल्प और समय (केवल चालू करने पर)', why: 'अगले पाठ का ईमेल भेजने के लिए।' },
      { data: 'माता-पिता/अभिभावक का नाम और ईमेल (केवल 18 से कम उम्र)', why: 'उनकी सहमति माँगने और दर्ज करने के लिए।' },
      { data: 'एक रैंडम ब्राउज़र आईडी और आने की तारीखें', why: 'कुल विज़िटर गिनने के लिए। किसी बच्चे के खाते से कभी नहीं जोड़ा जाता।' },
    ],
    rights: [
      'अपना डेटा देखें और डाउनलोड करें (प्रोफ़ाइल → डेटा एक्सपोर्ट)।',
      'नाम, कक्षा और सेटिंग्स सुधारें (प्रोफ़ाइल)।',
      'कभी भी सहमति वापस लें और खाता मिटाएँ (प्रोफ़ाइल → सहमति वापस लें और हटाएँ)। यह सहमति देने जितना ही आसान है।',
      'शिकायत अधिकारी को लिखकर किसी को अपने अधिकारों के लिए नामित करें।',
    ],
    children:
      '18 वर्ष से कम उम्र के किसी भी व्यक्ति के खाते को, उसका कोई भी डेटा उपयोग करने से पहले, माता-पिता या वैध अभिभावक की स्वीकृति चाहिए। हम बच्चों को ट्रैक नहीं करते और उन्हें विज्ञापन नहीं दिखाते।',
    withdraw: 'सहमति वापस लेने पर सारी प्रोसेसिंग रुक जाती है और 30 दिनों के भीतर आपका डेटा मिटा दिया जाता है।',
    grievance: `प्रश्न या शिकायत: ${GRIEVANCE.name}, ${GRIEVANCE.email}। हम 30 दिनों के भीतर जवाब देते हैं।`,
    board: 'संतुष्ट न होने पर आप भारतीय डेटा संरक्षण बोर्ड (Data Protection Board of India) में शिकायत कर सकते हैं।',
  },
};
