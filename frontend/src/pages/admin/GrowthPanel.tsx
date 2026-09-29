import React, { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { DailyStats, StatCounter, StatsService, TotalStats } from '../../services/stats';
import { Card, StatCard } from './adminUi';

const METRICS: { key: StatCounter; label: string }[] = [
  { key: 'visitors', label: 'Visitors' },
  { key: 'registrations', label: 'Registrations' },
  { key: 'activeStudents', label: 'Active students' },
  { key: 'lessonsCompleted', label: 'Lessons completed' },
  { key: 'doubtsAsked', label: 'Doubts asked' },
];

const sum = (days: DailyStats[], key: StatCounter) => days.reduce((n, d) => n + (d[key] || 0), 0);
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** Platform growth for admins: visitors, registrations and engagement from stats_daily / stats/totals. */
export const GrowthPanel: React.FC<{ totalStudents?: number }> = ({ totalStudents }) => {
  const [days, setDays] = useState<DailyStats[] | null>(null);
  const [totals, setTotals] = useState<TotalStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<StatCounter>('visitors');
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([StatsService.getDaily(30), StatsService.getTotals()])
      .then(([d, t]) => {
        setDays(d);
        setTotals(t);
      })
      .catch((err) => setError((err as Error).message || 'Could not load analytics.'));
  }, []);

  if (error) {
    return (
      <Card className="p-5 text-sm font-semibold text-[#8A2E17]">
        Analytics unavailable: {error}.
      </Card>
    );
  }
  if (!days || !totals) return <div aria-label="Loading analytics" className="h-[300px] rounded-[24px] skeleton-shimmer" />;

  const today = days[days.length - 1];
  const last7 = days.slice(-7);
  const prev7 = days.slice(-14, -7);
  const trend = (key: StatCounter) => {
    const now = sum(last7, key);
    const before = sum(prev7, key);
    if (!before) return now ? 'new this week' : 'no activity yet';
    const pct = Math.round(((now - before) / before) * 100);
    return `${pct >= 0 ? '+' : ''}${pct}% vs previous 7 days`;
  };
  const conversion = sum(last7, 'visitors') ? Math.round((sum(last7, 'registrations') / sum(last7, 'visitors')) * 100) : 0;

  const series = days.map((d) => d[metric] || 0);
  const max = Math.max(1, ...series);
  const label = METRICS.find((m) => m.key === metric)!.label;
  const W = 600;
  const H = 180;
  const gap = 2;
  const barW = W / series.length - gap;

  return (
    <section aria-labelledby="growth-title" className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-[10px] bg-[#12A594] text-white flex items-center justify-center">
          <TrendingUp className="w-4 h-4" />
        </span>
        <h3 id="growth-title" className="text-lg text-[#1E2233]">Growth</h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3">
        <StatCard label="Visitors today" value={today.visitors} hint={`${today.newVisitors} first-time`} tone="indigo" />
        <StatCard label="Visitors · 7 days" value={sum(last7, 'visitors')} hint={trend('visitors')} tone="indigo" />
        <StatCard label="Registrations · 7 days" value={sum(last7, 'registrations')} hint={`${conversion}% of visitors signed up`} tone="teal" />
        <StatCard label="Registered students" value={totalStudents ?? totals.registrations} hint={`${totals.visitors} unique visitors since launch`} tone="teal" />
        <StatCard label="Active students today" value={today.activeStudents} hint={`${sum(last7, 'activeStudents')} student-days this week`} tone="amber" />
        <StatCard label="Lessons completed · 7 days" value={sum(last7, 'lessonsCompleted')} hint={`${totals.lessonsCompleted} since launch`} tone="amber" />
      </div>

      <Card className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-extrabold text-[#1E2233]">
            {label} · last 30 days <span className="font-bold text-[#6B7280]">({sum(days, metric)} total)</span>
          </p>
          <div role="radiogroup" aria-label="Metric" className="flex flex-wrap gap-1 p-1 rounded-[14px] bg-[#F5F6FA] border-2 border-[#E3E5EC]">
            {METRICS.map((m) => (
              <button
                key={m.key}
                role="radio"
                aria-checked={metric === m.key}
                onClick={() => setMetric(m.key)}
                className={`px-2.5 py-1 rounded-[10px] text-[11.5px] font-extrabold cursor-pointer ${
                  metric === m.key ? 'bg-white text-[#3B4FE0] shadow-[0_2px_0_#E3E5EC]' : 'text-[#6B7280] hover:text-[#1E2233]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative" onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full h-[200px]" role="img" aria-label={`${label} per day for the last 30 days`} preserveAspectRatio="none">
            {[0.5, 1].map((f) => (
              <line key={f} x1={0} x2={W} y1={H - H * f} y2={H - H * f} stroke="#EDEFF6" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ))}
            <line x1={0} x2={W} y1={H} y2={H} stroke="#D7DCEF" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            {series.map((v, i) => {
              const h = v ? Math.max(6, (v / max) * (H - 8)) : 0;
              const x = i * (barW + gap);
              return (
                <g key={days[i].date}>
                  {/* hit target is the full column, larger than the bar */}
                  <rect x={x} y={0} width={barW + gap} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} />
                  {h > 0 && (
                    <path
                      d={`M${x},${H} V${H - h + 4} q0,-4 4,-4 h${Math.max(0, barW - 8)} q4,0 4,4 V${H} Z`}
                      fill={hover === i ? '#2A3BB8' : '#3B4FE0'}
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            })}
          </svg>
          <div className="flex justify-between text-[10.5px] font-bold text-[#9AA1B4] -mt-4 px-0.5" aria-hidden="true">
            <span>{shortDate(days[0].date)}</span>
            <span>{shortDate(days[14].date)}</span>
            <span>Today</span>
          </div>
          <span className="absolute left-0 top-0 text-[10.5px] font-bold text-[#9AA1B4]" aria-hidden="true">
            {max}
          </span>
          {hover !== null && (
            <div
              className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-[12px] bg-[#1E2233] text-white px-3 py-2 text-xs font-bold whitespace-nowrap"
              style={{ left: `${Math.min(88, Math.max(12, ((hover + 0.5) / series.length) * 100))}%` }}
            >
              {shortDate(days[hover].date)} · {series[hover]} {label.toLowerCase()}
            </div>
          )}
        </div>

        <table className="sr-only">
          <caption>{label} per day</caption>
          <thead>
            <tr>
              <th>Date</th>
              <th>{label}</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d, i) => (
              <tr key={d.date}>
                <td>{d.date}</td>
                <td>{series[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
};
