const STORAGE_KEY = 'ncert_prep_notification_sound';

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Private browsing / storage blocked: the toggle just won't persist across reloads.
  }
}

let audioCtx: AudioContext | null = null;

function playTones(notes: { freq: number; at: number; duration: number; gain: number }[]): void {
  if (!isSoundEnabled()) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    notes.forEach(({ freq, at, duration, gain: peak }) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + at;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(peak, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain).connect(audioCtx!.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    });
  } catch {
    // Autoplay policies can block audio before any user gesture — fail silently, the visual still shows.
  }
}

// Two-tone chime synthesized with the Web Audio API — no audio asset to fetch or license.
export function playNotificationSound(): void {
  playTones([
    { freq: 523.25, at: 0, duration: 0.25, gain: 0.18 },
    { freq: 783.99, at: 0.11, duration: 0.25, gain: 0.18 },
  ]);
}

// Rising 4-note arpeggio for badge unlocks — brighter and longer than a plain notification ping.
export function playCelebrationSound(): void {
  playTones([
    { freq: 523.25, at: 0, duration: 0.2, gain: 0.16 }, // C5
    { freq: 659.25, at: 0.09, duration: 0.2, gain: 0.16 }, // E5
    { freq: 783.99, at: 0.18, duration: 0.2, gain: 0.16 }, // G5
    { freq: 1046.5, at: 0.27, duration: 0.35, gain: 0.2 }, // C6
  ]);
}
