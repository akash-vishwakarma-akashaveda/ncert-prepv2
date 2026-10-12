/**
 * DPDP Act 2023 s.5 notice, shown before consent (sign-up, parent approval) and on /privacy.
 * Keep NOTICE_VERSION in sync with NOTICE_VERSION in backend/src/routes/users.ts; bump both when the
 * notice changes, and ConsentGate asks every signed-in user to agree to the new version.
 */
export const NOTICE_VERSION = '2026-10';

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
      { data: 'Name and email address (from Google or the form); your Google profile photo if you sign in with Google', why: 'To create and secure your account and let you sign in.' },
      { data: 'Your class, stream, chosen subjects, daily goal and city; your phone number if you add it', why: 'To show the right lessons on your dashboard and to contact you about your account.' },
      { data: 'Lessons opened, completed and saved; XP, streak and badges', why: 'To save your progress across devices.' },
      { data: 'Your display name, avatar or photo, XP and streak', why: 'Shown to students in your own class on the class leaderboard.' },
      { data: 'Doubts and feedback you write', why: 'So your teacher can reply to you.' },
      { data: 'Reminder choice and time (only if you turn it on)', why: 'To email you your next lesson.' },
      { data: 'Parent or guardian name, email and phone (under 13 only)', why: 'To tell them about the account and let them confirm or refuse it.' },
      { data: 'Visit counts (how many people visited each day, in totals only)', why: 'To measure how many people use the app. No profile of any visitor is built.' },
      { data: 'Services we use: YouTube plays the lessons, Google Fonts provides the text style, Google Sign-In is optional, and AWS (Mumbai) stores the data', why: 'YouTube and Google may set cookies and see your IP address under Google’s privacy policy. YouTube may show its own ads in the videos.' },
    ],
    rights: [
      'See and download your data (Profile → Export my data).',
      'Correct your name, class and settings (Profile).',
      'Withdraw consent and erase your account at any time (Profile → Withdraw consent & delete). It is as easy as giving consent.',
      'Nominate someone to exercise these rights for you, by writing to the Grievance Officer.',
    ],
    children:
      'Students aged 13 and over agree to this notice themselves. For a student under 13, we ask for a parent or guardian’s name, email and phone and email that parent, who can confirm the account or refuse it (refusing deletes the account and its data). We do not track children or show our own advertising.',
    withdraw: 'Withdrawing consent stops all processing, and your data is erased within 30 days.',
    grievance: `Questions or complaints: ${GRIEVANCE.name}, ${GRIEVANCE.email}. We reply within 30 days.`,
    board: 'If you are not satisfied, you can complain to the Data Protection Board of India.',
  },
  hi: {
    title: 'गोपनीयता सूचना',
    intro: 'NCERT Prep आपके व्यक्तिगत डेटा का डेटा फ़िड्यूशियरी है। हम केवल नीचे बताया गया डेटा, केवल इन्हीं कामों के लिए उपयोग करते हैं।',
    items: [
      { data: 'नाम और ईमेल पता (Google से या फ़ॉर्म से); Google से साइन-इन करने पर आपकी Google प्रोफ़ाइल फ़ोटो', why: 'आपका खाता बनाने, सुरक्षित रखने और साइन-इन के लिए।' },
      { data: 'आपकी कक्षा, स्ट्रीम, चुने गए विषय, रोज़ का लक्ष्य और शहर; जोड़ने पर आपका फ़ोन नंबर', why: 'डैशबोर्ड पर सही पाठ दिखाने और खाते के बारे में आपसे संपर्क करने के लिए।' },
      { data: 'खोले, पूरे किए और सहेजे गए पाठ; XP, स्ट्रीक और बैज', why: 'हर डिवाइस पर आपकी प्रगति सहेजने के लिए।' },
      { data: 'आपका नाम, अवतार या फ़ोटो, XP और स्ट्रीक', why: 'कक्षा लीडरबोर्ड पर केवल आपकी अपनी कक्षा के विद्यार्थियों को दिखाया जाता है।' },
      { data: 'आपके प्रश्न (डाउट) और फ़ीडबैक', why: 'ताकि शिक्षक आपको जवाब दे सकें।' },
      { data: 'रिमाइंडर का विकल्प और समय (केवल चालू करने पर)', why: 'अगले पाठ का ईमेल भेजने के लिए।' },
      { data: 'माता-पिता/अभिभावक का नाम, ईमेल और फ़ोन (केवल 13 से कम उम्र)', why: 'उन्हें खाते के बारे में बताने और खाते की पुष्टि करने या मना करने का मौका देने के लिए।' },
      { data: 'विज़िट की गिनती (हर दिन कितने लोग आए, केवल कुल संख्या में)', why: 'यह जानने के लिए कि कितने लोग ऐप का उपयोग करते हैं। किसी विज़िटर की प्रोफ़ाइल नहीं बनाई जाती।' },
      { data: 'हम इन सेवाओं का उपयोग करते हैं: पाठ YouTube पर चलते हैं, अक्षरों की शैली Google Fonts से आती है, Google साइन-इन वैकल्पिक है, और डेटा AWS (मुंबई) पर रखा जाता है', why: 'YouTube और Google, Google की गोपनीयता नीति के तहत कुकीज़ रख सकते हैं और आपका IP पता देख सकते हैं। YouTube वीडियो में अपने विज्ञापन दिखा सकता है।' },
    ],
    rights: [
      'अपना डेटा देखें और डाउनलोड करें (प्रोफ़ाइल → डेटा एक्सपोर्ट)।',
      'नाम, कक्षा और सेटिंग्स सुधारें (प्रोफ़ाइल)।',
      'कभी भी सहमति वापस लें और खाता मिटाएँ (प्रोफ़ाइल → सहमति वापस लें और हटाएँ)। यह सहमति देने जितना ही आसान है।',
      'शिकायत अधिकारी को लिखकर किसी को अपने अधिकारों के लिए नामित करें।',
    ],
    children:
      '13 वर्ष या उससे अधिक उम्र के विद्यार्थी इस सूचना पर स्वयं सहमति देते हैं। 13 वर्ष से कम उम्र के विद्यार्थी के लिए हम माता-पिता या अभिभावक का नाम, ईमेल और फ़ोन लेते हैं और उन्हें ईमेल करते हैं; वे खाते की पुष्टि कर सकते हैं या मना कर सकते हैं (मना करने पर खाता और उसका डेटा मिटा दिया जाता है)। हम बच्चों को ट्रैक नहीं करते और अपने विज्ञापन नहीं दिखाते।',
    withdraw: 'सहमति वापस लेने पर सारी प्रोसेसिंग रुक जाती है और 30 दिनों के भीतर आपका डेटा मिटा दिया जाता है।',
    grievance: `प्रश्न या शिकायत: ${GRIEVANCE.name}, ${GRIEVANCE.email}। हम 30 दिनों के भीतर जवाब देते हैं।`,
    board: 'संतुष्ट न होने पर आप भारतीय डेटा संरक्षण बोर्ड (Data Protection Board of India) में शिकायत कर सकते हैं।',
  },
};
