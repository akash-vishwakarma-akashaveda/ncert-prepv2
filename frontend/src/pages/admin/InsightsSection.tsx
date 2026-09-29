import React, { useEffect, useState } from 'react';
import { Gift, PlayCircle } from 'lucide-react';
import { ReferralService, ReferralRow } from '../../services/referrals';
import { VideoService, WatchStatRow } from '../../services/videos';
import { classLabel } from '../../data/gamification';
import { Card, SectionHeader, StatCard, inputClass } from './adminUi';

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatHours(hours: number): string {
  return hours < 1 ? `${Math.round(hours * 60)} min` : `${hours.toFixed(1)} h`;
}

export const InsightsSection: React.FC = () => {
  const [month, setMonth] = useState(currentMonth());
  const [referrals, setReferrals] = useState<ReferralRow[] | null>(null);
  const [watchRows, setWatchRows] = useState<WatchStatRow[] | null>(null);
  const [totalSeconds, setTotalSeconds] = useState(0);

  useEffect(() => {
    setReferrals(null);
    setWatchRows(null);
    ReferralService.getMonthlyBreakdown(month).then((r) => setReferrals(r.rows));
    VideoService.getWatchStats(month).then((r) => {
      setWatchRows(r.rows);
      setTotalSeconds(r.totalSeconds);
    });
  }, [month]);

  const totalReferrals = referrals?.reduce((n, r) => n + r.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Referrals & Watch Hours"
        description="Who's bringing in new students, and how much of the catalog is actually being watched — both for one calendar month."
        actions={
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className={`${inputClass} w-auto`}
          />
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Referred signups" value={referrals ? totalReferrals : '—'} hint="This month" tone="rose" />
        <StatCard label="Active referral codes" value={referrals ? referrals.length : '—'} hint="Used at least once" tone="indigo" />
        <StatCard label="Total watch hours" value={watchRows ? formatHours(totalSeconds / 3600) : '—'} hint="Across all videos" tone="teal" />
      </div>

      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-[#C9447F]" />
          <h3 className="text-sm font-extrabold text-[#1E2233]">Referral code performance</h3>
        </div>
        {!referrals ? (
          <p className="text-xs text-[#6B7280] py-2">Loading…</p>
        ) : referrals.length === 0 ? (
          <p className="text-xs text-[#6B7280] py-2">No referred signups in {month}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[#6B7280] border-b border-[#E3E5EC]">
                  <th className="py-2 pr-3 font-bold">Code</th>
                  <th className="py-2 pr-3 font-bold">Owner</th>
                  <th className="py-2 pr-3 font-bold text-right">Signups</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.code} className="border-b border-[#F1F3FB] last:border-0">
                    <td className="py-2 pr-3 font-extrabold text-[#1E2233]">{r.code}</td>
                    <td className="py-2 pr-3 text-[#4B5168]">{r.ownerName || r.ownerEmail || '—'}</td>
                    <td className="py-2 pr-3 text-right font-extrabold text-[#C9447F]">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <PlayCircle className="w-4 h-4 text-[#12A594]" />
          <h3 className="text-sm font-extrabold text-[#1E2233]">Video watch hours</h3>
        </div>
        <p className="text-[11px] text-[#6B7280] -mt-2">
          Approximate — sampled from the player every 30s of active playback, not exact seconds. Use it to estimate
          revenue against your own rate; it isn't a revenue figure by itself.
        </p>
        {!watchRows ? (
          <p className="text-xs text-[#6B7280] py-2">Loading…</p>
        ) : watchRows.length === 0 ? (
          <p className="text-xs text-[#6B7280] py-2">No watch time recorded in {month}.</p>
        ) : (
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-[#6B7280] border-b border-[#E3E5EC]">
                  <th className="py-2 pr-3 font-bold">Video</th>
                  <th className="py-2 pr-3 font-bold">Class · Subject</th>
                  <th className="py-2 pr-3 font-bold text-right">Watch hours</th>
                </tr>
              </thead>
              <tbody>
                {watchRows.map((r) => (
                  <tr key={r.youtubeId} className="border-b border-[#F1F3FB] last:border-0">
                    <td className="py-2 pr-3 text-[#1E2233] font-bold max-w-[320px] truncate">{r.title}</td>
                    <td className="py-2 pr-3 text-[#6B7280]">
                      {classLabel(r.classSort)} · {r.subject}
                    </td>
                    <td className="py-2 pr-3 text-right font-extrabold text-[#12A594]">{formatHours(r.hours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
