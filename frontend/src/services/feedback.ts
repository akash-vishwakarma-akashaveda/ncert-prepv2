import { httpsCallable, FunctionsError } from 'firebase/functions';
import { functions, isFirebaseConfigured } from './firebase';
import { StorageService } from './storage';

export interface FeedbackSubmissionResult {
  success: boolean;
  message: string;
  remainingPerHour?: number;
}

const RATE_LIMIT_MESSAGE =
  'You can send at most 5 feedback messages per hour. Please try again later.';

export const FeedbackService = {
  async submitFeedback(
    userId: string,
    youtubeId: string,
    content: string
  ): Promise<FeedbackSubmissionResult> {
    if (!content || !content.trim()) {
      return { success: false, message: 'Feedback message cannot be empty.' };
    }

    if (!userId) {
      return { success: false, message: 'You must be signed in to submit feedback.' };
    }

    // Client-side count only drives the "N left" hint; the Cloud Function is the real limiter (NFR-3).
    if (StorageService.getFeedbackTimestamps(userId).length >= 5) {
      return { success: false, message: RATE_LIMIT_MESSAGE, remainingPerHour: 0 };
    }

    if (isFirebaseConfigured && functions) {
      try {
        const call = httpsCallable<
          { youtubeId: string; message: string },
          { success: boolean; remainingPerHour: number }
        >(functions, 'submitFeedback');
        const res = await call({ youtubeId, message: content.trim() });
        StorageService.recordFeedbackSubmission(userId);
        return {
          success: true,
          message: 'Thank you! Your private feedback has been delivered to the educator.',
          remainingPerHour: res.data.remainingPerHour,
        };
      } catch (err) {
        const code = (err as FunctionsError).code;
        if (code === 'functions/resource-exhausted') {
          return { success: false, message: RATE_LIMIT_MESSAGE, remainingPerHour: 0 };
        }
        if (code === 'functions/invalid-argument' || code === 'functions/not-found') {
          return { success: false, message: (err as FunctionsError).message };
        }
        console.error('Failed to submit feedback:', err);
        return { success: false, message: 'Could not send feedback at this time. Please try again later.' };
      }
    }

    const rateCheck = StorageService.recordFeedbackSubmission(userId);
    return {
      success: true,
      message: 'Feedback submitted (demo mode — stored locally only).',
      remainingPerHour: rateCheck.remaining,
    };
  },
};
