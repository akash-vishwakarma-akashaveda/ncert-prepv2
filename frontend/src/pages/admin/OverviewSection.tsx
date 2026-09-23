import React from 'react';
import { MessageCircleQuestion, FileWarning, ArrowRight, Sliders } from 'lucide-react';
import { ChapterNotes, Doubt, Feedback, Video } from '../../types';
import { AdminClassNode } from './adminTree';
import { Card, SectionHeader, StatCard } from './adminUi';
import { GrowthPanel } from './GrowthPanel';
import type { AdminNavigateOptions, AdminSectionId } from './AdminDashboard';
import { useDashboardConfig } from '../../hooks/useDashboardConfig';

interface OverviewSectionProps {
  tree: AdminClassNode[];
  videos: Video[];
  notes: ChapterNotes[];
  doubts: Doubt[];
  feedbacks: Feedback[];
  studentStats: { total: number; byClass: Record<string, number> } | null;
  onNavigate: (section: AdminSectionId, options?: AdminNavigateOptions) => void;
}

function timeAgo(ms: number): string {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  tree,
  videos,
  notes,
  doubts,
  feedbacks,
  studentStats,
  onNavigate,
}) => {
  const publishedKeys = new Set(notes.filter((n) => n.isPublished).map((n) => n.id));
  const allChapters = tree.flatMap((c) => c.subjects.flatMap((s) => s.chapters));
  const visibleChapters = allChapters.filter((ch) => ch.isActive);
  const chaptersWithNotes = visibleChapters.filter((ch) => publishedKeys.has(ch.key)).length;
  const coverage = visibleChapters.length ? Math.round((chaptersWithNotes / visibleChapters.length) * 100) : 0;

  const openDoubts = doubts.filter((d) => d.status === 'open').sort((a, b) => a.created_at - b.created_at);
  const newFeedback = feedbacks.filter((f) => f.status !== 'reviewed').length;
  const activeVideos = videos.filter((v) => v.isActive).length;
  const { config } = useDashboardConfig();
  const liveAnn = config?.announcement?.isActive ? config.announcement : null;
  const activeSpotlightsCount = config
    ? Object.values(config.spotlights).filter((s) => s.isActive).length
    : 0;

  const missingNotes = visibleChapters
    .filter((ch) => ch.videoCount > 0 && !publishedKeys.has(ch.key))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Overview"
        description="What needs your attention today, and how complete each class is."
      />

      <GrowthPanel totalStudents={studentStats?.total} />

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <StatCard
          label="Students"
          value={studentStats ? studentStats.total : '—'}
          hint={studentStats ? 'Registered accounts' : 'Available with live Firebase'}
          tone="indigo"
        />
        <StatCard label="Active lessons" value={activeVideos} hint={`${videos.length - activeVideos} hidden`} tone="teal" onClick={() => onNavigate('videos')} />
        <StatCard
          label="Notes coverage"
          value={`${coverage}%`}
          hint={`${chaptersWithNotes} of ${visibleChapters.length} chapters`}
          tone="amber"
          onClick={() => onNavigate('notes')}
        />
        <StatCard
          label="Open doubts"
          value={openDoubts.length}
          hint={openDoubts[0] ? `Oldest ${timeAgo(openDoubts[0].created_at)}` : 'All caught up'}
          tone={openDoubts.length ? 'rose' : 'slate'}
          onClick={() => onNavigate('doubts')}
        />
        <StatCard label="New feedback" value={newFeedback} hint="Not yet reviewed" onClick={() => onNavigate('feedback')} />
      </div>

      {/* Student Dashboard Direct Control Card */}
      <Card className="p-4 bg-gradient-to-r from-[#EEF0FD]/80 via-white to-purple-50/60 border-2 border-[#3B4FE0]/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-xl bg-[#3B4FE0] text-white flex items-center justify-center">
                <Sliders className="w-3.5 h-3.5" />
              </span>
              <h3 className="text-sm font-extrabold text-[#1E2233]">Student Dashboard Live Status</h3>
              {liveAnn ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-[#E7F7F1] text-[#0B7A67]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Broadcast Live
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  No Active Broadcast
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B7280]">
              {liveAnn
                ? `"${liveAnn.title}" broadcasting to ${liveAnn.targetClass === 'all' ? 'all 12 classes' : `Class ${parseInt(liveAnn.targetClass, 10)}`}.`
                : 'No announcement currently pinned.'}{' '}
              {activeSpotlightsCount > 0
                ? `${activeSpotlightsCount} teacher spotlight lessons active.`
                : 'No daily spotlight lessons set.'}
            </p>
          </div>
          <button
            onClick={() => onNavigate('student-control')}
            className="self-start md:self-auto flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold rounded-[14px] bg-[#3B4FE0] text-white hover:bg-[#2F3FB5] shadow-[0_5px_0_#EDEFF6] transition-colors cursor-pointer shrink-0"
          >
            <Sliders className="w-3.5 h-3.5" />
            Manage Student Dashboard
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1E2233] flex items-center gap-2">
              <MessageCircleQuestion className="w-4 h-4 text-[#C24A2C]" />
              Doubts waiting longest
            </h3>
            <button onClick={() => onNavigate('doubts')} className="text-xs font-extrabold text-[#3B4FE0] hover:underline cursor-pointer">
              Open inbox
            </button>
          </div>
          {openDoubts.length === 0 ? (
            <p className="text-xs text-[#6B7280] py-4">No open doubts. Nice work.</p>
          ) : (
            <ul className="divide-y divide-[#E3E5EC]">
              {openDoubts.slice(0, 5).map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => onNavigate('doubts', { doubtId: d.id })}
                    className="w-full text-left py-2.5 flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#1E2233] truncate group-hover:text-[#3B4FE0]">{d.question}</p>
                      <p className="text-[11px] text-[#6B7280] truncate">
                        {d.userName || d.userEmail || 'Student'} • Class {parseInt(d.class_sort, 10)} {d.subject} • {d.chapter_name}
                      </p>
                    </div>
                    <span className="text-[11px] text-[#6B7280] shrink-0">{timeAgo(d.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1E2233] flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-[#C98A0E]" />
              Chapters with lessons but no notes
            </h3>
            <button onClick={() => onNavigate('notes')} className="text-xs font-extrabold text-[#3B4FE0] hover:underline cursor-pointer">
              All notes
            </button>
          </div>
          {missingNotes.length === 0 ? (
            <p className="text-xs text-[#6B7280] py-4">Every chapter with lessons has published notes.</p>
          ) : (
            <ul className="divide-y divide-[#E3E5EC]">
              {missingNotes.map((ch) => (
                <li key={ch.key}>
                  <button
                    onClick={() => onNavigate('notes', { notesKey: ch.key })}
                    className="w-full text-left py-2.5 flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#1E2233] truncate group-hover:text-[#3B4FE0]">{ch.chapter_name}</p>
                      <p className="text-[11px] text-[#6B7280]">
                        Class {parseInt(ch.class_sort, 10)} • {ch.subject} • {ch.videoCount} lessons
                      </p>
                    </div>
                    <span className="text-xs font-extrabold text-[#3B4FE0] flex items-center gap-1 shrink-0">
                      Write notes <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-[#1E2233]">Class coverage</h3>
          <button onClick={() => onNavigate('curriculum')} className="text-xs font-extrabold text-[#3B4FE0] hover:underline cursor-pointer">
            Manage classes
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F6FA] text-[#6B7280] font-extrabold border-y border-[#E3E5EC]">
              <tr>
                <th className="py-2.5 px-5">Class</th>
                <th className="py-2.5 px-3">Students</th>
                <th className="py-2.5 px-3">Subjects</th>
                <th className="py-2.5 px-3">Chapters</th>
                <th className="py-2.5 px-3">Lessons</th>
                <th className="py-2.5 px-3">Notes</th>
                <th className="py-2.5 px-3">Open doubts</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E5EC] text-[#1E2233]">
              {tree.map((c) => {
                const chapters = c.subjects.flatMap((s) => s.chapters).filter((ch) => ch.isActive);
                const withNotes = chapters.filter((ch) => publishedKeys.has(ch.key)).length;
                const pct = chapters.length ? Math.round((withNotes / chapters.length) * 100) : 0;
                return (
                  <tr key={c.class_sort}>
                    <td className="py-2.5 px-5 font-extrabold">{c.name}</td>
                    <td className="py-2.5 px-3">{studentStats ? studentStats.byClass[c.class_sort] ?? 0 : '—'}</td>
                    <td className="py-2.5 px-3">{c.subjects.length}</td>
                    <td className="py-2.5 px-3">{chapters.length}</td>
                    <td className="py-2.5 px-3">{c.videoCount}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2 min-w-[110px]">
                        <div className="flex-1 h-1.5 bg-[#E3E5EC] rounded-full overflow-hidden">
                          <div className="h-full bg-[#12A594]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-bold">{pct}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">{openDoubts.filter((d) => d.class_sort === c.class_sort).length}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                          c.isActive ? 'bg-[#E7F7F1] text-[#0B7A67]' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {c.isActive ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
