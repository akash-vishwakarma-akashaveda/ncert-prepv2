import { api } from './api/client';

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
  announcements: DashboardAnnouncement[];
  spotlights: Record<string, SpotlightLesson>; // classSort -> SpotlightLesson
  policy: ContentAccessPolicy;
}

const KEY = 'student_dashboard';

// Every project starts empty: nothing is shown to students until an admin publishes it.
const EMPTY_CONFIG: StudentDashboardConfig = {
  announcements: [],
  spotlights: {},
  policy: { freePreviewEnabled: true, freePreviewCount: 1, allowGuestNotes: false },
};

// Older configs stored a single `announcement` slot instead of a list — fold it in so it isn't lost.
function merge(raw: (Partial<StudentDashboardConfig> & { announcement?: DashboardAnnouncement | null }) | null | undefined): StudentDashboardConfig {
  const announcements = raw?.announcements ?? (raw?.announcement ? [raw.announcement] : []);
  return { ...EMPTY_CONFIG, ...raw, announcements, policy: { ...EMPTY_CONFIG.policy, ...raw?.policy } };
}

export const DashboardControlService = {
  async getConfig(): Promise<StudentDashboardConfig> {
    try {
      return merge(await api.get<Partial<StudentDashboardConfig> | null>(`/api/settings/${KEY}`));
    } catch (err) {
      console.warn('Could not load dashboard config', err);
      return EMPTY_CONFIG;
    }
  },

  async saveConfig(cfg: StudentDashboardConfig): Promise<void> {
    try {
      await api.put(`/api/settings/${KEY}`, cfg);
    } catch (err) {
      // Surface it: the admin must not see "saved" when students will never get the change.
      throw new Error(`Could not publish to students: ${(err as Error).message || 'request failed'}`);
    }
  },

  async createAnnouncement(input: Omit<DashboardAnnouncement, 'id' | 'createdAt'>): Promise<DashboardAnnouncement> {
    const cfg = await this.getConfig();
    const created: DashboardAnnouncement = { ...input, id: `ann-${Date.now()}`, createdAt: Date.now() };
    cfg.announcements = [created, ...cfg.announcements];
    await this.saveConfig(cfg);
    return created;
  },

  async updateAnnouncement(id: string, updates: Partial<Omit<DashboardAnnouncement, 'id' | 'createdAt'>>): Promise<void> {
    const cfg = await this.getConfig();
    cfg.announcements = cfg.announcements.map((a) => (a.id === id ? { ...a, ...updates } : a));
    await this.saveConfig(cfg);
  },

  async deleteAnnouncement(id: string): Promise<void> {
    const cfg = await this.getConfig();
    cfg.announcements = cfg.announcements.filter((a) => a.id !== id);
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
