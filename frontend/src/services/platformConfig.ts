import { useEffect, useState } from 'react';
import { api } from './api/client';

/**
 * Runtime switches admins can change without a deploy (Admin → Platform settings).
 * Stored under settings key "platform" (public read, admin write) — the backend enforces the
 * same limits server-side too (see prep_ncert/backend/src/routes).
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

const KEY = 'platform';
const EVENT = 'ncert_platform_config_updated';

const merge = (raw: Partial<PlatformConfig> | null | undefined): PlatformConfig => ({
  features: { ...DEFAULT_PLATFORM_CONFIG.features, ...raw?.features },
  limits: { ...DEFAULT_PLATFORM_CONFIG.limits, ...raw?.limits },
  contact: { ...DEFAULT_PLATFORM_CONFIG.contact, ...raw?.contact },
});

let cached: Promise<PlatformConfig> | null = null;

export const PlatformConfigService = {
  /** One read per session; admin saves broadcast the new value to every open hook. */
  get(): Promise<PlatformConfig> {
    if (!cached) {
      cached = api
        .get<Partial<PlatformConfig> | null>(`/api/settings/${KEY}`)
        .then(merge)
        .catch(() => DEFAULT_PLATFORM_CONFIG);
    }
    return cached;
  },

  async save(cfg: PlatformConfig): Promise<void> {
    const clean = merge(cfg);
    await api.put(`/api/settings/${KEY}`, clean);
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
