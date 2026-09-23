import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface DashboardAnnouncement {
  id: string;
  title: string;
  message: string;
  tone: 'info' | 'warning' | 'success' | 'exam';
  targetClass: string; // 'all' or '01'..'12'
  actionLabel?: string;
  actionUrl?: string;
  isActive: boolean;
  createdAt: number;
}

export interface SpotlightLesson {
  classSort: string; // 'all' or '01'..'12'
  videoId: string;
  title: string;
  subject: string;
  chapterName: string;
  note: string; // Teacher note, e.g. "Focus topic for this week"
  isActive: boolean;
  updatedAt: number;
}

export interface ContentAccessPolicy {
  freePreviewEnabled: boolean;
  /** Visitors can play the first lesson of this many chapters per subject. */
  freePreviewCount: number;
  /** Visitors can read published notes & cheat sheets of lessons they can preview. */
  allowGuestNotes: boolean;
}

export interface StudentDashboardConfig {
  announcement: DashboardAnnouncement | null;
  spotlights: Record<string, SpotlightLesson>; // classSort -> SpotlightLesson
  policy: ContentAccessPolicy;
}

const STORAGE_KEY = 'ncert_prep_student_dashboard_config';
const CONFIG_DOC_PATH = 'settings/student_dashboard';

// Every project starts empty: nothing is shown to students until an admin publishes it.
const EMPTY_CONFIG: StudentDashboardConfig = {
  announcement: null,
  spotlights: {},
  policy: { freePreviewEnabled: true, freePreviewCount: 1, allowGuestNotes: false },
};

const DEFAULT_CONFIG = EMPTY_CONFIG;

function readLocalConfig(): StudentDashboardConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...saved, policy: { ...DEFAULT_CONFIG.policy, ...saved.policy } };
    }
  } catch (err) {
    console.warn('Could not read dashboard config from local storage', err);
  }
  return DEFAULT_CONFIG;
}

function writeLocalConfig(cfg: StudentDashboardConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent('ncert_dashboard_config_updated', { detail: cfg }));
  } catch (err) {
    console.warn('Could not save dashboard config to local storage', err);
  }
}

export const DashboardControlService = {
  async getConfig(): Promise<StudentDashboardConfig> {
    const local = readLocalConfig();
    if (!db) return local;
    try {
      const snap = await getDoc(doc(db, CONFIG_DOC_PATH));
      if (snap.exists()) {
        const raw = snap.data() as StudentDashboardConfig;
        const data = { ...EMPTY_CONFIG, ...raw, policy: { ...EMPTY_CONFIG.policy, ...raw.policy } };
        writeLocalConfig(data);
        return data;
      }
    } catch (err) {
      // Fallback to local config when offline or without permissions
    }
    return local;
  },

  async saveConfig(cfg: StudentDashboardConfig): Promise<void> {
    writeLocalConfig(cfg);
    if (!db) return;
    try {
      await setDoc(doc(db, CONFIG_DOC_PATH), cfg, { merge: true });
    } catch (err) {
      // Surface it: the admin must not see "saved" when students will never get the change.
      throw new Error(`Could not publish to students: ${(err as Error).message || 'Firestore write failed'}`);
    }
  },

  async setAnnouncement(announcement: DashboardAnnouncement | null): Promise<void> {
    const cfg = await this.getConfig();
    cfg.announcement = announcement;
    await this.saveConfig(cfg);
  },

  async setSpotlight(spotlight: SpotlightLesson): Promise<void> {
    const cfg = await this.getConfig();
    cfg.spotlights[spotlight.classSort] = spotlight;
    await this.saveConfig(cfg);
  },

  async removeSpotlight(classSort: string): Promise<void> {
    const cfg = await this.getConfig();
    delete cfg.spotlights[classSort];
    await this.saveConfig(cfg);
  },

  async updatePolicy(policy: Partial<ContentAccessPolicy>): Promise<void> {
    const cfg = await this.getConfig();
    cfg.policy = { ...cfg.policy, ...policy };
    await this.saveConfig(cfg);
  },
};
