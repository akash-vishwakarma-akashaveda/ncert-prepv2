import React, { useState } from 'react';
import { Bell, BellOff, Check, CalendarDays, CalendarClock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type Frequency = 'daily' | 'weekly';

const OPTIONS: { id: Frequency; title: string; detail: string; icon: React.ReactNode }[] = [
  { id: 'daily', title: 'Daily study prompt', detail: 'Every day', icon: <CalendarClock className="w-4 h-4" /> },
  { id: 'weekly', title: 'Weekly revision digest', detail: 'Every Sunday', icon: <CalendarDays className="w-4 h-4" /> },
];

// Daytime hours only; nobody wants a revision email at 3 AM.
export const REMINDER_HOURS = Array.from({ length: 17 }, (_, i) => i + 6);

export const reminderHour = (frequency: Frequency, hour?: number) => hour ?? (frequency === 'daily' ? 19 : 18);

export const formatHour = (hour: number) => `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;

export const reminderSummary = (enabled: boolean, frequency: Frequency, hour?: number) =>
  enabled ? `${frequency === 'daily' ? 'Daily' : 'Sun'}, ${formatHour(reminderHour(frequency, hour))}` : 'Off';

export const ReminderSettingsCard: React.FC = () => {
  const { user, updateSettings } = useAuth();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'saved' | 'error'; text: string } | null>(null);

  if (!user) return null;
  const enabled = user.reminders_enabled;
  const noEmail = !user.email;

  const save = async (
    changes: { reminders_enabled?: boolean; reminder_frequency?: Frequency; reminder_hour?: number },
    text: string
  ) => {
    setSaving(true);
    setStatus(null);
    try {
      await updateSettings(changes);
      setStatus({ type: 'saved', text });
      setTimeout(() => setStatus((s) => (s?.text === text ? null : s)), 3000);
    } catch {
      setStatus({ type: 'error', text: 'Could not save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="reminders" aria-labelledby="reminders-title" className="bg-white border-[3px] border-[color:var(--card-line)] rounded-[26px] p-5 sm:p-6 space-y-5 scroll-mt-24">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={`w-11 h-11 rounded-[15px] flex items-center justify-center shrink-0 ${
              enabled ? 'bg-[#12A594] text-white shadow-[0_4px_0_#0B7A67]' : 'bg-[#F1F3FB] text-[#6B7280]'
            }`}
          >
            {enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </span>
          <div>
            <h2 id="reminders-title" className="text-lg text-[#1E2233]">
              Revision reminders
            </h2>
            <p className="text-sm font-semibold text-[#6B7280]">
              {enabled
                ? `On · ${reminderSummary(true, user.reminder_frequency, user.reminder_hour)} IST to ${user.email || 'your email'}`
                : 'Off · turn on to get an email suggesting your next lesson'}
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Email revision reminders"
          disabled={saving || noEmail}
          onClick={() => save({ reminders_enabled: !enabled }, enabled ? 'Reminders turned off.' : 'Reminders turned on.')}
          className={`relative inline-flex h-[27px] w-12 shrink-0 rounded-full p-[3px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            enabled ? 'bg-[color:var(--brand)]' : 'bg-[#D7DCEF]'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-[21px] w-[21px] rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-[21px]' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {noEmail && (
        <p className="p-3 rounded-[14px] bg-[color:var(--page)] border-2 border-[color:var(--card-line)] text-xs text-[#6B7280]">
          Reminders are sent by email. You signed in with a mobile number, so there is no email address to send them to.
        </p>
      )}

      <fieldset disabled={!enabled || saving} className="space-y-2">
        <legend className="text-xs font-extrabold text-[#1E2233] mb-2">How often?</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OPTIONS.map((opt) => {
            const selected = user.reminder_frequency === opt.id;
            return (
              <label
                key={opt.id}
                className={`flex items-center gap-3 p-3.5 rounded-[18px] border-[3px] transition-colors ${
                  !enabled
                    ? 'border-[color:var(--card-line)] bg-[#F7F8FC] text-[#9AA1B4] cursor-not-allowed'
                    : selected
                    ? 'border-[color:var(--brand-edge)] bg-[color:var(--brand)] text-white cursor-pointer'
                    : 'border-[color:var(--card-line)] bg-white text-[#1E2233] hover:border-[color:var(--brand-line)] cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="reminder_frequency"
                  value={opt.id}
                  checked={selected}
                  onChange={() => save({ reminder_frequency: opt.id }, `Reminders set to ${opt.title.toLowerCase()}.`)}
                  className="sr-only"
                />
                <span>{opt.icon}</span>
                <span className="text-sm">
                  <span className="block font-extrabold">{opt.title}</span>
                  <span className="block text-xs font-semibold opacity-75">{opt.detail}</span>
                </span>
              </label>
            );
          })}
        </div>
        <label className="flex flex-wrap items-center gap-2 pt-2 text-sm text-[#1E2233]">
          <span className="font-extrabold">Send at</span>
          <select
            value={reminderHour(user.reminder_frequency, user.reminder_hour)}
            onChange={(e) => save({ reminder_hour: Number(e.target.value) }, `Reminders will arrive at ${formatHour(Number(e.target.value))} IST.`)}
            className="px-3.5 py-2.5 rounded-2xl border-2 border-[color:var(--card-line)] bg-[color:var(--page)] text-sm font-bold focus:border-[color:var(--brand)] outline-none disabled:text-[#9AA1B4]"
          >
            {REMINDER_HOURS.map((h) => (
              <option key={h} value={h}>
                {formatHour(h)}
              </option>
            ))}
          </select>
          <span className="text-xs text-[#6B7280]">IST</span>
        </label>
        {!enabled && <p className="text-xs text-[#6B7280]">Turn reminders on to choose how often and when.</p>}
      </fieldset>

      <div className="min-h-5 text-xs" aria-live="polite">
        {status && (
          <span className={`inline-flex items-center gap-1 font-bold ${status.type === 'saved' ? 'text-[#0B7A67]' : 'text-[#C24A2C]'}`}>
            {status.type === 'saved' && <Check className="w-3.5 h-3.5" />}
            {status.text}
          </span>
        )}
        {!status && <span className="text-[#6B7280]">Every email has a one-click unsubscribe link.</span>}
      </div>
    </section>
  );
};
