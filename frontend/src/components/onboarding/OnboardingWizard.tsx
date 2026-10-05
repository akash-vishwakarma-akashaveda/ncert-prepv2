import React, { useState, useEffect } from 'react';
import { ClassGroup } from '../../types';
import { ArrowRight, ArrowLeft, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { STREAMS, StreamId, classHasStreams, getStream, isInStream } from '../../data/streams';
import { ClassTile } from '../home/ClassGrid';
import { REMINDER_HOURS, formatHour, reminderHour, reminderSummary } from '../profile/ReminderSettingsCard';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: (grade: string) => void;
  classes: ClassGroup[];
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  onClose,
  onCompleted,
  classes,
}) => {
  const { user, updateProfile, updateSettings, applyReferralCode } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedStream, setSelectedStream] = useState<string>('');
  const [dailyGoal, setDailyGoal] = useState<number>(25);
  const [enableReminders, setEnableReminders] = useState<boolean>(false);
  const [reminderFreq, setReminderFreq] = useState<'daily' | 'weekly'>('weekly');
  const [reminderHourValue, setReminderHourValue] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [referral, setReferral] = useState('');
  const [city, setCity] = useState('');
  const [referralError, setReferralError] = useState('');

  // The wizard stays mounted, so re-seed from the latest profile each time it opens.
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setSelectedGrade(user?.grade_preference || '');
    setSelectedSubjects(user?.focus_subjects || []);
    setSelectedStream(user?.stream || '');
    setDailyGoal(user?.study_goal_minutes || 25);
    setEnableReminders(Boolean(user?.reminders_enabled));
    setReminderFreq(user?.reminder_frequency || 'weekly');
    setReminderHourValue(user?.reminder_hour);
    setReferral('');
    setReferralError('');
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const hasClass = Boolean(user?.grade_preference);
  // New accounts without a referrer get an optional referral box on the last step.
  const askReferral = Boolean(user && !user.has_referrer && !user.onboarding_completed);
  const availableSubjects = classes.find((c) => c.class_sort === selectedGrade)?.subjects || [];
  const lessonCount = (grade: string) => classes.find((c) => c.class_sort === grade)?.videoCount || 0;

  // Picking a class is the whole first step, so move straight on (a short pause lets the tile's pressed look show).
  const pickGrade = (grade: string) => {
    setSelectedGrade(grade);
    setSelectedSubjects([]);
    window.setTimeout(() => setStep((prev) => (prev === 1 ? 2 : prev)), 280);
  };

  // Skipping keeps an already-chosen class; a student without a class must pick one first.
  const handleSkip = async () => {
    if (!hasClass) return;
    if (user) await updateProfile({ onboarding_completed: true });
    localStorage.setItem(`ncert_prep_onboarded_${user?.userId || 'guest'}`, 'true');
    onClose();
  };

  // Picking a stream fills in its subjects, so a senior does not have to tick nine chips by hand.
  // They stay editable below, and subjects outside the stream remain open from My subjects.
  const pickStream = (id: StreamId) => {
    setSelectedStream(id);
    const stream = getStream(id);
    setSelectedSubjects(availableSubjects.filter((subject) => isInStream(subject, stream)));
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      // A referral code can only be added before setup is marked complete, so apply it first.
      if (user && askReferral && referral.trim()) {
        try {
          await applyReferralCode(referral.trim());
        } catch (err) {
          setReferralError(err instanceof Error ? err.message : 'That referral code was not found');
          return;
        }
      }
      if (user) {
        await updateProfile({
          grade_preference: selectedGrade,
          study_goal_minutes: dailyGoal,
          focus_subjects: selectedSubjects,
          stream: classHasStreams(selectedGrade) ? selectedStream : '',
          ...(city.trim() ? { city: city.trim() } : {}),
          onboarding_completed: true,
        });

        await updateSettings({
          reminders_enabled: enableReminders,
          reminder_frequency: reminderFreq,
          reminder_hour: reminderHour(reminderFreq, reminderHourValue),
        });
      }

      // Mark in localStorage as well for instant persistent check
      localStorage.setItem(`ncert_prep_onboarded_${user?.userId || 'guest'}`, 'true');
      onCompleted(selectedGrade);
      onClose();
    } catch (err) {
      console.error('Failed to save onboarding preferences:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS = [
    ['Your class', "Pick the class you're studying in. Your dashboard, syllabus and search show only this class."],
    [
      classHasStreams(selectedGrade) ? 'Your stream & subjects' : 'Focus subjects',
      classHasStreams(selectedGrade)
        ? 'Pick your stream and we will put its subjects first. Every other subject stays open too.'
        : 'Choose the subjects you want on top of your dashboard. All subjects stay available. Optional.',
    ],
    ['Daily target & reminders', 'How many minutes a day, and should we email you a nudge?'],
    ['All set!', 'Check your choices and start learning.'],
  ];
  const [stepTitle, stepBody] = STEPS[step - 1];
  const chip = (on: boolean) =>
    `cursor-pointer border-[3px] font-extrabold ${on ? 'bg-[color:var(--brand)] border-[color:var(--brand-edge)] text-white' : 'bg-white border-[#E3E5EC] text-[#4B5168] hover:border-[color:var(--brand-line)]'}`;
  const summary: [string, string][] = [
    ['Class', `Class ${parseInt(selectedGrade, 10)}`],
    ['Focus subjects', selectedSubjects.length ? selectedSubjects.join(', ') : 'All subjects'],
    ['Daily target', `${dailyGoal} min`],
    ['Reminders', enableReminders ? `${reminderSummary(true, reminderFreq, reminderHourValue)} IST` : 'Off'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E2233]/50 backdrop-blur-xs" role="dialog" aria-modal="true" aria-label="Set up your account">
      <div className="relative w-full max-w-[620px] max-h-[92vh] flex flex-col bg-white rounded-[32px] border-[3px] border-[color:var(--card-line)] shadow-[0_8px_0_#E3E5EC] animate-pop-soft">
        <div className="px-6 sm:px-8 pt-6 sm:pt-7 space-y-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`flex-1 h-[9px] rounded-full transition-colors duration-300 ${i <= step ? 'bg-[#12A594]' : 'bg-[color:var(--card-line)]'}`} />
            ))}
            {hasClass && (
              <button onClick={handleSkip} aria-label="Close setup" className="ml-2 w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-[color:var(--page)] border-2 border-[#E3E5EC] text-[#6B7280] hover:text-[#1E2233] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-extrabold tracking-[0.1em] text-[color:var(--brand)]">STEP {step} OF 4</span>
            <h2 className="text-[27px] leading-tight text-[#1E2233]">{stepTitle}</h2>
            <p className="text-[13.5px] font-semibold leading-relaxed text-[#6B7280]">{stepBody}</p>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-5 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(78px,1fr))] gap-[11px] pb-1">
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((c) => (
                  <ClassTile key={c} classSort={c} selected={selectedGrade === c} onClick={() => pickGrade(c)} />
                ))}
              </div>
              {selectedGrade && (
                <p className="text-xs font-bold text-[#12A594]">
                  Class {parseInt(selectedGrade, 10)}:{' '}
                  {lessonCount(selectedGrade) > 0 ? `${lessonCount(selectedGrade)} lessons ready.` : 'lessons coming soon.'} You can change
                  this later in Profile; progress is kept.
                </p>
              )}
            </div>
          )}

          {step === 2 && classHasStreams(selectedGrade) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pb-4">
              {STREAMS.map((stream) => (
                <button
                  key={stream.id}
                  type="button"
                  aria-pressed={selectedStream === stream.id}
                  onClick={() => pickStream(stream.id)}
                  className={`p-3.5 rounded-[18px] text-left space-y-1 ${chip(selectedStream === stream.id)}`}
                >
                  <span className="block text-[14px]">{stream.label}</span>
                  <span className={`block text-[11px] font-semibold leading-snug ${selectedStream === stream.id ? 'text-white/85' : 'text-[#6B7280]'}`}>
                    {stream.blurb}
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 2 &&
            (availableSubjects.length === 0 ? (
              <p className="text-center text-sm font-semibold text-[#6B7280] bg-[#F7F8FC] border-2 border-dashed border-[#E3E5EC] rounded-[22px] p-6">
                Lessons for this class haven&apos;t been published yet. You can set focus subjects later in Profile.
              </p>
            ) : (
              <div className="flex flex-wrap gap-[11px]">
                {availableSubjects.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    aria-pressed={selectedSubjects.includes(subject)}
                    onClick={() => toggleSubject(subject)}
                    className={`px-[18px] py-[11px] rounded-full text-[13px] ${chip(selectedSubjects.includes(subject))}`}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            ))}

          {step === 3 && (
            <div className="space-y-3.5">
              <div className="flex flex-wrap gap-2.5">
                {[25, 50, 75, 100].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    aria-pressed={dailyGoal === mins}
                    onClick={() => setDailyGoal(mins)}
                    className={`flex-1 min-w-[88px] p-3.5 rounded-[18px] border-[3px] text-[13.5px] font-extrabold text-[#1E2233] cursor-pointer ${
                      dailyGoal === mins ? 'bg-[#FFC53D] border-[#E0A81F]' : 'bg-white border-[#E3E5EC] hover:border-[#FFD97A]'
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>

              <div className="rounded-[18px] bg-[#F7F8FC] border-2 border-[#E3E5EC] p-3.5 space-y-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={enableReminders}
                  onClick={() => setEnableReminders(!enableReminders)}
                  className="w-full flex items-center gap-3 text-left cursor-pointer"
                >
                  <span className={`w-12 h-[27px] shrink-0 rounded-full p-[3px] flex transition-colors ${enableReminders ? 'bg-[#12A594] justify-end' : 'bg-[#D7DCEF] justify-start'}`}>
                    <span className="w-[21px] h-[21px] rounded-full bg-white" />
                  </span>
                  <span className="text-[13px] font-extrabold text-[#1E2233]">
                    Email reminders {enableReminders ? 'on' : 'off'}
                    <span className="block text-[11.5px] font-semibold text-[#6B7280]">A short email with your next lesson. Change it any time.</span>
                  </span>
                </button>
                {enableReminders && (
                  <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t-2 border-[color:var(--card-line)]">
                    {(['daily', 'weekly'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        aria-pressed={reminderFreq === f}
                        onClick={() => setReminderFreq(f)}
                        className={`flex-1 min-w-[110px] py-2.5 rounded-[14px] text-[12.5px] ${chip(reminderFreq === f)}`}
                      >
                        {f === 'daily' ? 'Daily' : 'Weekly (Sun)'}
                      </button>
                    ))}
                    <label className="w-full flex items-center gap-2 text-[12.5px] font-extrabold text-[#1E2233]">
                      Send at
                      <select
                        value={reminderHour(reminderFreq, reminderHourValue)}
                        onChange={(e) => setReminderHourValue(Number(e.target.value))}
                        className="px-3 py-2 rounded-xl border-2 border-[#E3E5EC] bg-white text-[12.5px] font-bold focus:border-[color:var(--brand)] outline-none"
                      >
                        {REMINDER_HOURS.map((h) => (
                          <option key={h} value={h}>
                            {formatHour(h)}
                          </option>
                        ))}
                      </select>
                      <span className="text-[#6B7280]">IST</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <dl className="rounded-[22px] bg-[#FFF6E2] border-[3px] border-[#FFD97A] p-[18px] space-y-2">
              {summary.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 items-baseline">
                  <dt className="text-[12.5px] font-bold text-[#8A5A14]">{k}</dt>
                  <dd className="text-[12.5px] font-extrabold text-[#1E2233] text-right">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {step === 4 && (
            <div className="mt-4">
              <label htmlFor="onboarding-city" className="block text-xs font-extrabold text-[#1E2233] mb-1.5">
                Your city <span className="font-bold text-[#9AA1B4]">(optional)</span>
              </label>
              <input
                id="onboarding-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={80}
                autoComplete="address-level2"
                placeholder="e.g. Lucknow"
                className="w-full px-4 py-3 rounded-2xl border-[3px] border-[#E3E5EC] bg-white text-sm font-bold text-[#1E2233] placeholder:font-semibold placeholder:text-[#9AA1B4] focus:border-[color:var(--brand)] focus:outline-none"
              />
            </div>
          )}

          {step === 4 && askReferral && (
            <div className="mt-4">
              <label htmlFor="onboarding-referral" className="block text-xs font-extrabold text-[#1E2233] mb-1.5">
                Referral code <span className="font-bold text-[#9AA1B4]">(optional)</span>
              </label>
              <input
                id="onboarding-referral"
                value={referral}
                onChange={(e) => {
                  setReferral(e.target.value.toUpperCase());
                  setReferralError('');
                }}
                maxLength={20}
                autoComplete="off"
                placeholder="Got one from a friend? Enter it here"
                aria-invalid={Boolean(referralError)}
                aria-describedby={referralError ? 'onboarding-referral-error' : undefined}
                className="w-full px-4 py-3 rounded-2xl border-[3px] border-[#E3E5EC] bg-white text-sm font-bold tracking-[0.06em] text-[#1E2233] placeholder:tracking-normal placeholder:font-semibold placeholder:text-[#9AA1B4] focus:border-[color:var(--brand)] focus:outline-none"
              />
              {referralError && (
                <p id="onboarding-referral-error" role="alert" className="mt-1.5 text-xs font-bold text-[#D14343]">
                  {referralError}. Fix it or clear the box to continue.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-6 sm:px-8 pb-6 sm:pb-7 flex items-center gap-2.5">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
              className="flex items-center gap-1.5 px-5 py-3 rounded-2xl text-[13px] font-extrabold bg-[color:var(--page)] border-2 border-[#E3E5EC] text-[#6B7280] hover:text-[#1E2233] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : hasClass ? (
            <button type="button" onClick={handleSkip} className="px-4 py-3 text-[13px] font-extrabold text-[#6B7280] hover:text-[#1E2233] cursor-pointer">
              Skip setup
            </button>
          ) : (
            <span className="text-xs font-bold text-[#6B7280]">Pick your class to continue</span>
          )}

          <button
            type="button"
            disabled={(step === 1 && !selectedGrade) || submitting}
            onClick={step < 4 ? () => setStep((prev) => (prev + 1) as 2 | 3 | 4) : handleFinish}
            className="ml-auto btn-3d [--edge:#0B7A67] flex items-center gap-1.5 px-[26px] py-3 rounded-2xl text-sm font-extrabold text-white bg-[#12A594] hover:bg-[#10988A] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step < 4 ? (
              <>
                Continue <ArrowRight className="w-4 h-4" />
              </>
            ) : submitting ? (
              'Saving…'
            ) : (
              'Start learning'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
