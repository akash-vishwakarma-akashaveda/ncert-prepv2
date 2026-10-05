/** The NCERT QuickPrep YouTube channel; every lesson video is published there. Override with VITE_YOUTUBE_CHANNEL_URL. */
export const YOUTUBE_CHANNEL_URL: string = import.meta.env.VITE_YOUTUBE_CHANNEL_URL || 'https://www.youtube.com/@NCERTQuickPrep';

/** Opens the channel with YouTube's own "Subscribe?" prompt. */
export const YOUTUBE_SUBSCRIBE_URL = `${YOUTUBE_CHANNEL_URL.replace(/\/+$/, '')}?sub_confirmation=1`;
