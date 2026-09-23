import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { Video, User, UserProgress, Feedback } from '../types';
import { StorageService } from './storage';
import { normalizeVideo, toStoredVideo } from '../data/classFormat';
import { bumpDemoStat } from './stats';


export const FirestoreService = {
  // Fetch the catalogue from Firestore; offline, the last catalogue this browser cached (never sample data)
  async fetchVideos(): Promise<Video[]> {
    // Check cached catalog first (FR-4)
    const cached = StorageService.getCachedCatalog();

    if (isFirebaseConfigured && db) {
      try {
        const videosRef = collection(db, 'videos');
        const snapshot = await getDocs(videosRef);
        // A successful answer is authoritative, even when empty: it also replaces any stale cache
        // (older builds cached a bundled sample catalogue).
        const videos: Video[] = [];
        snapshot.forEach((docSnap) => {
          videos.push(normalizeVideo(docSnap.data(), docSnap.id));
        });
        StorageService.setCachedCatalog(videos);
        return videos;
      } catch (err) {
        console.warn('Firestore fetch failed, falling back to the last cached catalogue:', err);
      }
    }

    // Offline or a failed fetch: the last real catalogue this browser saw. Never sample data.
    return cached ? cached.map((v) => normalizeVideo(v as unknown as Record<string, unknown>, v.youtube_id)) : [];
  },

  // Get User Profile from Firestore or LocalStorage
  async getUserProfile(userId: string): Promise<User | null> {
    if (isFirebaseConfigured && db) {
      try {
        const userRef = doc(db, 'users', userId);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          return snapshot.data() as User;
        }
      } catch (err) {
        console.warn('Failed to fetch user from Firestore:', err);
      }
    }
    return StorageService.getLocalUser();
  },

  // Create or retrieve user document on first sign-up (Section 4 of SRS)
  async createOrGetUser(
    userId: string,
    email: string | null,
    displayName?: string | null,
    phoneNumber?: string | null
  ): Promise<User> {
    const defaultUser: User = {
      userId,
      email,
      displayName: displayName || email?.split('@')[0] || 'Student',
      phoneNumber: phoneNumber || null,
      reminders_enabled: false, // DPDP: opt-in only, never pre-ticked
      reminder_frequency: 'weekly',
      last_watched_video: null,
      created_at: Date.now(),
    };

    if (isFirebaseConfigured && db) {
      try {
        const userRef = doc(db, 'users', userId);
        const existing = await getDoc(userRef);
        if (existing.exists()) {
          return existing.data() as User;
        }
        await setDoc(userRef, {
          ...defaultUser,
          created_at: serverTimestamp(),
        });
        StorageService.setLocalUser(defaultUser);
        return defaultUser;
      } catch (err) {
        console.warn('Failed to create/get user in Firestore:', err);
      }
    }

    // Local / Demo mode fallback
    const localUser = StorageService.getLocalUser();
    if (localUser && localUser.userId === userId) {
      return localUser;
    }
    StorageService.setLocalUser(defaultUser);
    return defaultUser;
  },

  // Update user reminder settings (FR-8)
  async updateUserSettings(
    userId: string,
    settings: Partial<Pick<User, 'reminders_enabled' | 'reminder_frequency' | 'reminder_hour'>>
  ): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, settings);
      } catch (err) {
        console.warn('Failed to update user settings in Firestore:', err);
      }
    }

    const localUser = StorageService.getLocalUser();
    if (localUser) {
      StorageService.setLocalUser({ ...localUser, ...settings });
    }
  },

  // Update last watched video (FR-6)
  async updateLastWatched(userId: string, youtubeId: string): Promise<void> {
    StorageService.setLastWatchedVideo(userId, youtubeId);

    if (isFirebaseConfigured && db) {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          last_watched_video: youtubeId,
        });
      } catch (err) {
        console.warn('Failed to update last_watched_video in Firestore:', err);
      }
    }

    const localUser = StorageService.getLocalUser();
    if (localUser) {
      StorageService.setLocalUser({ ...localUser, last_watched_video: youtubeId });
    }
  },

  // Fetch all user progress items for a user
  async getUserProgress(userId: string): Promise<Record<string, UserProgress>> {
    const localProgress = StorageService.getUserProgress(userId);

    if (isFirebaseConfigured && db) {
      try {
        const progressCol = collection(db, 'users', userId, 'user_progress');
        const snapshot = await getDocs(progressCol);
        if (!snapshot.empty) {
          const map: Record<string, UserProgress> = {};
          snapshot.forEach((d) => {
            const data = d.data() as Omit<UserProgress, 'youtube_id'>;
            map[d.id] = {
              youtube_id: d.id,
              ...data,
            };
          });
          StorageService.setUserProgress(userId, map);
          return map;
        }
      } catch (err) {
        console.warn('Failed to fetch user progress from Firestore:', err);
      }
    }

    return localProgress;
  },

  // Upsert a video progress record (FR-6)
  async saveVideoProgress(
    userId: string,
    youtubeId: string,
    progress: { completed?: boolean; favorited?: boolean }
  ): Promise<UserProgress> {
    const localMap = StorageService.getUserProgress(userId);
    const existing = localMap[youtubeId] || {
      youtube_id: youtubeId,
      completed: false,
      favorited: false,
      last_viewed: Date.now(),
    };

    const updated: UserProgress = {
      ...existing,
      completed: progress.completed !== undefined ? progress.completed : existing.completed,
      favorited: progress.favorited !== undefined ? progress.favorited : existing.favorited,
      last_viewed: Date.now(),
    };

    // Demo stand-in for the countLessonProgress Cloud Function (no-op in live mode).
    if (!localMap[youtubeId]) bumpDemoStat('lessonsStarted');
    if (updated.completed && !existing.completed) bumpDemoStat('lessonsCompleted');
    localMap[youtubeId] = updated;
    StorageService.setUserProgress(userId, localMap);

    if (isFirebaseConfigured && db) {
      try {
        const progressDoc = doc(db, 'users', userId, 'user_progress', youtubeId);
        await setDoc(progressDoc, {
          completed: updated.completed,
          favorited: updated.favorited,
          last_viewed: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.warn('Failed to save progress to Firestore:', err);
      }
    }

    return updated;
  },

  // Self-service account deletion (NFR-1 / NFR-11)
  async deleteUserAccount(userId: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        // Delete all progress subcollection docs
        const progressCol = collection(db, 'users', userId, 'user_progress');
        const snapshot = await getDocs(progressCol);
        for (const docSnap of snapshot.docs) {
          await deleteDoc(docSnap.ref);
        }
        // Delete user document
        await deleteDoc(doc(db, 'users', userId));
      } catch (err) {
        console.warn('Failed to delete user document from Firestore:', err);
      }
    }
    StorageService.clearUserData(userId);
  },

  // Update full user profile (name, grade preference, study goal, reminders)
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, updates);
      } catch (err) {
        console.warn('Failed to update user profile in Firestore:', err);
      }
    }
    const localUser = StorageService.getLocalUser();
    if (localUser) {
      StorageService.setLocalUser({ ...localUser, ...updates });
    }
  },

  // ADMIN: Add a new video to database
  async addVideo(video: Video): Promise<void> {
    const catalog = StorageService.getCachedCatalog() || [];
    const existingIndex = catalog.findIndex((v) => v.youtube_id === video.youtube_id);
    if (existingIndex >= 0) {
      catalog[existingIndex] = video;
    } else {
      catalog.unshift(video);
    }
    StorageService.setCachedCatalog(catalog);

    if (isFirebaseConfigured && db) {
      try {
        const videoDoc = doc(db, 'videos', video.youtube_id);
        await setDoc(videoDoc, {
          ...toStoredVideo(video),
          created_at: serverTimestamp(),
        });
      } catch (err) {
        console.error('Failed to add video to Firestore:', err);
        throw err;
      }
    }
  },

  // ADMIN: Update existing video metadata
  async updateVideo(youtubeId: string, updates: Partial<Video>): Promise<void> {
    const catalog = StorageService.getCachedCatalog() || [];
    const index = catalog.findIndex((v) => v.youtube_id === youtubeId);
    if (index >= 0) {
      catalog[index] = { ...catalog[index], ...updates };
      StorageService.setCachedCatalog(catalog);
    }

    if (isFirebaseConfigured && db) {
      try {
        const videoDoc = doc(db, 'videos', youtubeId);
        await updateDoc(videoDoc, toStoredVideo(updates));
      } catch (err) {
        console.error('Failed to update video in Firestore:', err);
        throw err;
      }
    }
  },

  // ADMIN: Toggle video active status (SRS 4.3 Content Moderation)
  async toggleVideoActive(youtubeId: string, isActive: boolean): Promise<void> {
    await this.updateVideo(youtubeId, { isActive });
  },

  // ADMIN: Delete video from database
  async deleteVideo(youtubeId: string): Promise<void> {
    const catalog = StorageService.getCachedCatalog() || [];
    const filtered = catalog.filter((v) => v.youtube_id !== youtubeId);
    StorageService.setCachedCatalog(filtered);

    if (isFirebaseConfigured && db) {
      try {
        const videoDoc = doc(db, 'videos', youtubeId);
        await deleteDoc(videoDoc);
      } catch (err) {
        console.error('Failed to delete video from Firestore:', err);
        throw err;
      }
    }
  },

  // ADMIN: Fetch feedback submissions for review
  async getFeedbackList(): Promise<Feedback[]> {
    if (isFirebaseConfigured && db) {
      try {
        const feedbackCol = collection(db, 'feedback');
        const snapshot = await getDocs(feedbackCol);
        const list: Feedback[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const createdAt = data.created_at;
          list.push({
            ...(data as Omit<Feedback, 'feedbackId'>),
            feedbackId: docSnap.id,
            created_at:
              createdAt && typeof createdAt.toMillis === 'function' ? createdAt.toMillis() : Date.now(),
          });
        });
        return list.sort((a, b) => Number(b.created_at) - Number(a.created_at));
      } catch (err) {
        console.warn('Failed to fetch feedbacks from Firestore:', err);
      }
    }

    // Demo mode (no Firebase keys): feedback submitted in this browser only.
    const stored = localStorage.getItem('ncert_prep_feedbacks');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    return [];
  },

  // ADMIN: Update feedback review status
  async updateFeedbackStatus(feedbackId: string, status: 'new' | 'reviewed'): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        const fbDoc = doc(db, 'feedback', feedbackId);
        await updateDoc(fbDoc, { status });
      } catch (err) {
        console.warn('Failed to update feedback status in Firestore:', err);
      }
    }
    const stored = localStorage.getItem('ncert_prep_feedbacks');
    if (stored) {
      try {
        const list: Feedback[] = JSON.parse(stored);
        const idx = list.findIndex((f) => f.feedbackId === feedbackId);
        if (idx >= 0) {
          list[idx].status = status;
          localStorage.setItem('ncert_prep_feedbacks', JSON.stringify(list));
        }
      } catch {
        // ignore
      }
    }
  },
};
