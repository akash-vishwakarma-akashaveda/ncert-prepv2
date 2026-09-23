export interface YTPlayer {
  destroy: () => void;
  getVideoData?: () => { title?: string; video_id?: string };
}

interface YTPlayerEvent {
  target: YTPlayer;
  data: number;
}

export interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      host?: string;
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (e: YTPlayerEvent) => void;
        onStateChange?: (e: YTPlayerEvent) => void;
        onError?: (e: YTPlayerEvent) => void;
      };
    }
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const YT_STATE_ENDED = 0;

// 2 invalid id, 5 HTML5 error, 100 removed/private, 101/150 embedding disabled, 153 missing referrer.
export const YT_UNAVAILABLE_ERROR_CODES = [2, 5, 100, 101, 150, 153];

let apiPromise: Promise<YTNamespace> | null = null;

export function loadYouTubeIframeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      script.remove();
      reject(new Error('Failed to load the YouTube player'));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}
