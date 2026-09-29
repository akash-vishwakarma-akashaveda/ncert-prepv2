import { api, ApiError } from './api/client';
import { Feedback } from '../types';

export interface FeedbackSubmissionResult {
  success: boolean;
  message: string;
  remainingPerHour?: number;
}

const RATE_LIMIT_MESSAGE = 'You can send at most 5 feedback messages per hour. Please try again later.';

export const FeedbackService = {
  async submitFeedback(userId: string, youtubeId: string, content: string): Promise<FeedbackSubmissionResult> {
    if (!content || !content.trim()) {
      return { success: false, message: 'Feedback message cannot be empty.' };
    }
    if (!userId) {
      return { success: false, message: 'You must be signed in to submit feedback.' };
    }

    try {
      await api.post('/api/feedback', { youtubeId, message: content.trim() });
      return { success: true, message: 'Thank you! Your private feedback has been delivered to the educator.' };
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        return { success: false, message: RATE_LIMIT_MESSAGE, remainingPerHour: 0 };
      }
      if (err instanceof ApiError && err.status === 400) {
        return { success: false, message: err.message };
      }
      console.error('Failed to submit feedback:', err);
      return { success: false, message: 'Could not send feedback at this time. Please try again later.' };
    }
  },

  async listAll(): Promise<Feedback[]> {
    return api.get<Feedback[]>('/api/feedback');
  },

  async updateStatus(feedbackId: string, status: 'new' | 'reviewed'): Promise<void> {
    await api.patch(`/api/feedback/${encodeURIComponent(feedbackId)}`, { status });
  },
};
