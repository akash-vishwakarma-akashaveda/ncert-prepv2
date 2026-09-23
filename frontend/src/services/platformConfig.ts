import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

/**
 * Runtime switches admins can change without a deploy (Admin → Platform settings).
 * Stored in settings/platform (public read, admin write). Cloud Functions read the same doc
 * (functions/src/platform.ts), so limits and kill switches are enforced server-side too.
 */
export interface PlatformConfig {
  features: {
    /** Students can ask doubts under lessons. */
    doubts: boolean;
    /** Students can send lesson feedback. */
    feedback: boolean;
    /** "Register with email" is offered. Google sign-in is always on. */
    emailSignup: boolean;
    /** Revision reminder emails are sent (global kill switch; students' own choices are kept). */
    reminderEmails: boolean;
  };
  limits: {
    doubtsPerDay: number;
    feedbackPerHour: number;
  };
  /** DPDP: the Grievance Officer shown in the privacy notice. */
  contact: {
    grievanceName: string;
    grievanceEmail: string;
  };
}

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  features: { doubts: true, feedback: true, emailSignup: true, reminderEmails: true },
  limits: { doubtsPerDay: 10, feedbackPerHour: 5 },
  contact: {
    grievanceName: import.meta.env.VITE_GRIEVANCE_OFFICER_NAME || 'Grievance Officer, NCERT Prep',
    grievanceEmail: import.meta.env.VITE_GRIEVANCE_EMAIL || 'privacy@ncertprep.io',
  },
};

const DOC = 'settings/platform';
const LOCAL_KEY = 'ncert_prep_platform_config';
const EVENT = 'ncert_platform_config_updated';

const merge = (raw: Partial<PlatformConfig> | undefined): PlatformConfig => ({
  features: { ...DEFAULT_PLATFORM_CONFIG.features, ...raw?.features },
  limits: { ...DEFAULT_PLATFORM_CONFIG.limits, ...raw?.limits },
  contact: { ...DEFAULT_PLATFORM_CONFIG.contact, ...raw?.contact },
});

let cached: Promise<PlatformConfig> | null = null;

export const PlatformConfigService = {
  /** One read per session; admin saves broadcast the new value to every open hook. */
  get(): Promise<PlatformConfig> {
    if (!cached) {
      cached = (async () => {
        if (isFirebaseConfigured && db) {
          try {
            const snap = await getDoc(doc(db, DOC));
            return merge(snap.data() as Partial<PlatformConfig> | undefined);
          } catch {
            return DEFAULT_PLATFORM_CONFIG;
          }
        }
        try {
          return merge(JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null') || undefined);
        } catch {
          return DEFAULT_PLATFORM_CONFIG;
        }
      })();
    }
    return cached;
  },

  async save(cfg: PlatformConfig): Promise<void> {
    const clean = merge(cfg);
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, DOC), clean);
    } else {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(clean));
    }
    cached = Promise.resolve(clean);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: clean }));
  },
};

export function usePlatformConfig(): PlatformConfig {
  const [cfg, setCfg] = useState<PlatformConfig>(DEFAULT_PLATFORM_CONFIG);
  useEffect(() => {
    let live = true;
    PlatformConfigService.get().then((c) => live && setCfg(c));
    const onUpdate = (e: Event) => setCfg((e as CustomEvent<PlatformConfig>).detail);
    window.addEventListener(EVENT, onUpdate);
    return () => {
      live = false;
      window.removeEventListener(EVENT, onUpdate);
    };
  }, []);
  return cfg;
}
