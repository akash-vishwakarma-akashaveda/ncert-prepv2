import { useEffect, useState, useCallback, useRef } from 'react';

export type FocusMode = 'focus' | 'short' | 'long';
export type PomodoroPreset = 'standard' | 'deep' | 'sprint' | 'custom';

export interface PomodoroDurations {
  focus: number;
  short: number;
  long: number;
}

export const POMODORO_PRESETS: Record<Exclude<PomodoroPreset, 'custom'>, PomodoroDurations> = {
  standard: { focus: 25 * 60, short: 5 * 60, long: 15 * 60 },
  deep: { focus: 50 * 60, short: 10 * 60, long: 30 * 60 },
  sprint: { focus: 15 * 60, short: 3 * 60, long: 10 * 60 },
};

export const FOCUS_DURATIONS = POMODORO_PRESETS.standard;
// Shortest preset block; shorter custom blocks still count as study time but earn no XP.
export const MIN_XP_FOCUS_SECONDS = 15 * 60;

const STORAGE_KEYS = {
  task: 'ncert_prep_pomodoro_task',
  preset: 'ncert_prep_pomodoro_preset',
  sound: 'ncert_prep_pomodoro_sound',
  floating: 'ncert_prep_pomodoro_floating',
  durations: 'ncert_prep_pomodoro_durations',
};

// Web Audio API chime synthesizer for self-contained, offline-ready bell chimes
export function playPomodoroChime(type: 'focus_end' | 'break_end' = 'focus_end') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'focus_end') {
      // Pleasant victory chime: C5 -> E5 -> G5
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.28);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc.start(now);
      osc.stop(now + 0.85);
    } else {
      // Gentle return chime: A5 -> F5 -> D5
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880.0, now);
      osc.frequency.exponentialRampToValueAtTime(698.46, now + 0.14);
      osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.3);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      osc.start(now);
      osc.stop(now + 0.75);
    }
  } catch {
    // Silently ignore if audio context cannot be initialized (e.g. autoplay policies or headless tests)
  }
}

// Lives in the student layout so a running session survives page changes.
export function useFocusTimer() {
  const [mode, setMode] = useState<FocusMode>('focus');
  const [cycleStep, setCycleStep] = useState<number>(1); // 1, 2, 3, 4
  const [preset, setPresetState] = useState<PomodoroPreset>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.preset);
      return (saved as PomodoroPreset) || 'standard';
    } catch {
      return 'standard';
    }
  });

  const [durations, setDurations] = useState<PomodoroDurations>(() => {
    try {
      const savedPreset = (localStorage.getItem(STORAGE_KEYS.preset) as PomodoroPreset) || 'standard';
      if (savedPreset !== 'custom' && POMODORO_PRESETS[savedPreset]) {
        return POMODORO_PRESETS[savedPreset];
      }
      const savedDurs = localStorage.getItem(STORAGE_KEYS.durations);
      if (savedDurs) return JSON.parse(savedDurs);
    } catch {
      // fallback
    }
    return POMODORO_PRESETS.standard;
  });

  const [secondsLeft, setSecondsLeft] = useState<number>(durations.focus);
  const [running, setRunning] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [focusSecondsToday, setFocusSecondsToday] = useState(0);

  const [currentTask, setCurrentTaskState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.task) || '';
    } catch {
      return '';
    }
  });

  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.sound);
      return val !== 'false';
    } catch {
      return true;
    }
  });

  const [autoAdvance, setAutoAdvance] = useState<boolean>(false);

  const [isFloating, setIsFloatingState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.floating) === 'true';
    } catch {
      return false;
    }
  });

  // Phones start with the small pill so the mini timer doesn't cover the page.
  const [isMinimized, setIsMinimized] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 640);

  // References to keep callbacks fresh without restarting timers
  const runningRef = useRef(running);
  runningRef.current = running;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const cycleStepRef = useRef(cycleStep);
  cycleStepRef.current = cycleStep;
  const durationsRef = useRef(durations);
  durationsRef.current = durations;
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const autoAdvanceRef = useRef(autoAdvance);
  autoAdvanceRef.current = autoAdvance;

  const setCurrentTask = useCallback((task: string) => {
    setCurrentTaskState(task);
    try {
      localStorage.setItem(STORAGE_KEYS.task, task);
    } catch {
      // ignore
    }
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem(STORAGE_KEYS.sound, String(enabled));
    } catch {
      // ignore
    }
  }, []);

  const setIsFloating = useCallback((val: boolean) => {
    setIsFloatingState(val);
    try {
      localStorage.setItem(STORAGE_KEYS.floating, String(val));
    } catch {
      // ignore
    }
  }, []);

  const toggleFloating = useCallback(() => {
    setIsFloatingState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEYS.floating, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const setPreset = useCallback((nextPreset: PomodoroPreset) => {
    setPresetState(nextPreset);
    try {
      localStorage.setItem(STORAGE_KEYS.preset, nextPreset);
    } catch {
      // ignore
    }

    if (nextPreset !== 'custom') {
      const nextDurs = POMODORO_PRESETS[nextPreset];
      setDurations(nextDurs);
      try {
        localStorage.setItem(STORAGE_KEYS.durations, JSON.stringify(nextDurs));
      } catch {
        // ignore
      }
      setRunning(false);
      setSecondsLeft(nextDurs[modeRef.current]);
    }
  }, []);

  const setCustomMinutes = useCallback((modeToEdit: FocusMode, minutes: number) => {
    const clampedMins = Math.max(1, Math.min(120, minutes));
    const nextSeconds = clampedMins * 60;
    setDurations((prev) => {
      const next = { ...prev, [modeToEdit]: nextSeconds };
      try {
        localStorage.setItem(STORAGE_KEYS.durations, JSON.stringify(next));
        localStorage.setItem(STORAGE_KEYS.preset, 'custom');
      } catch {
        // ignore
      }
      return next;
    });
    setPresetState('custom');
    if (modeRef.current === modeToEdit) {
      setRunning(false);
      setSecondsLeft(nextSeconds);
    }
  }, []);

  // Main countdown tick
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Interval completion. A skipped block moves the cycle on but earns nothing: only a finished focus block counts.
  const completeInterval = useCallback((finished: boolean) => {
    const currentMode = modeRef.current;
    const currentStep = cycleStepRef.current;
    const durs = durationsRef.current;
    const advance = autoAdvanceRef.current;

    if (currentMode === 'focus') {
      if (finished) {
        setSessionsToday((n) => n + 1);
        setFocusSecondsToday((s) => s + durs.focus);
        if (durs.focus >= MIN_XP_FOCUS_SECONDS) window.dispatchEvent(new CustomEvent('quickprep-focus-completed'));
      }

      if (finished && soundEnabledRef.current) {
        playPomodoroChime('focus_end');
      }

      // 4th Pomodoro leads to Long Break, otherwise Short Break
      if (currentStep >= 4) {
        setMode('long');
        setSecondsLeft(durs.long);
        setCycleStep(1); // Next focus will be #1
      } else {
        setMode('short');
        setSecondsLeft(durs.short);
      }
    } else if (currentMode === 'short') {
      if (finished && soundEnabledRef.current) {
        playPomodoroChime('break_end');
      }
      // After short break, move to next focus step
      setCycleStep((s) => Math.min(4, s + 1));
      setMode('focus');
      setSecondsLeft(durs.focus);
    } else {
      // Long break ended -> reset to focus step 1
      if (finished && soundEnabledRef.current) {
        playPomodoroChime('break_end');
      }
      setCycleStep(1);
      setMode('focus');
      setSecondsLeft(durs.focus);
    }

    setRunning(advance);
  }, []);

  useEffect(() => {
    if (running && secondsLeft === 0) {
      completeInterval(true);
    }
  }, [running, secondsLeft, completeInterval]);

  const selectMode = useCallback((next: FocusMode) => {
    setRunning(false);
    setMode(next);
    setSecondsLeft(durationsRef.current[next]);
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    setSecondsLeft(durationsRef.current[mode]);
  }, [mode]);

  // Skip to next interval immediately
  const skipNext = useCallback(() => {
    completeInterval(false);
  }, [completeInterval]);

  const label = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const total = durations[mode];

  return {
    mode,
    cycleStep,
    preset,
    durations,
    secondsLeft,
    total,
    running,
    sessionsToday,
    minutesToday: Math.round(focusSecondsToday / 60),
    label,
    currentTask,
    soundEnabled,
    autoAdvance,
    isFloating,
    isMinimized,
    selectMode,
    reset,
    skipNext,
    toggle: () => setRunning((r) => (secondsLeft === 0 ? r : !r)),
    setRunning,
    setPreset,
    setCustomMinutes,
    setCurrentTask,
    setSoundEnabled,
    setAutoAdvance,
    setIsFloating,
    toggleFloating,
    setIsMinimized,
    toggleMinimized: () => setIsMinimized((m) => !m),
    playChime: playPomodoroChime,
  };
}

export type FocusTimer = ReturnType<typeof useFocusTimer>;
