import { api } from './api/client';
import { Video } from '../types';

export interface SheetSyncResult {
  ok: true;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export const VideoService = {
  async fetchVideos(): Promise<Video[]> {
    return api.get<Video[]>('/api/videos');
  },
  /** Public demo lessons for the landing page: no session required. */
  async fetchFeatured(): Promise<Video[]> {
    return api.get<Video[]>('/api/videos/featured');
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
  async syncFromExcel(file: File): Promise<SheetSyncResult> {
    const formData = new FormData();
    formData.append('file', file);
    return api.uploadFile<SheetSyncResult>('/api/admin/sync-sheet/upload', formData);
  },
  async syncFromSheetUrl(url: string): Promise<SheetSyncResult> {
    return api.post<SheetSyncResult>('/api/admin/sync-sheet/url', { url });
  },
  async unlinkSheetUrl(): Promise<void> {
    await api.delete('/api/admin/sync-sheet/url');
  },
  async getLinkedSheetUrl(): Promise<string | null> {
    const value = await api.get<{ url?: string } | null>('/api/settings/video_catalog_sheet_url');
    return value?.url ?? null;
  },
  // Fire-and-forget: a dropped ping just slightly undercounts an approximate watch-hours estimate.
  sendWatchHeartbeat(youtubeId: string, seconds: number): void {
    api.post(`/api/videos/${encodeURIComponent(youtubeId)}/watch-heartbeat`, { seconds }).catch(() => undefined);
  },
  async getWatchStats(month?: string): Promise<WatchStatsResponse> {
    const qs = month ? `?month=${encodeURIComponent(month)}` : '';
    return api.get<WatchStatsResponse>(`/api/videos/admin/watch-stats${qs}`);
  },
};

export interface WatchStatRow {
  youtubeId: string;
  title: string;
  subject: string;
  chapterName: string;
  classSort: string;
  seconds: number;
  hours: number;
}

export interface WatchStatsResponse {
  month: string;
  totalSeconds: number;
  rows: WatchStatRow[];
}
