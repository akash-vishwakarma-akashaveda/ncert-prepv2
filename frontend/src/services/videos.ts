import { api } from './api/client';
import { Video } from '../types';

// Same method names/signatures as FirestoreService's video methods, so useCatalog.ts and
// VideosSection.tsx only need their import swapped, not their logic.
export const VideoService = {
  async fetchVideos(): Promise<Video[]> {
    return api.get<Video[]>('/api/videos');
  },
  async addVideo(video: Video): Promise<void> {
    await api.post('/api/videos', video);
  },
  async updateVideo(youtubeId: string, updates: Partial<Video>): Promise<void> {
    await api.patch(`/api/videos/${encodeURIComponent(youtubeId)}`, updates);
  },
  async toggleVideoActive(youtubeId: string, isActive: boolean): Promise<void> {
    await this.updateVideo(youtubeId, { isActive });
  },
  async deleteVideo(youtubeId: string): Promise<void> {
    await api.delete(`/api/videos/${encodeURIComponent(youtubeId)}`);
  },
};
