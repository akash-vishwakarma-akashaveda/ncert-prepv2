import React, { useState, useEffect, useMemo } from 'react';
import {
  Megaphone,
  Star,
  Lock,
  Eye,
  Play,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Flame,
  Pin,
} from 'lucide-react';
import { Video } from '../../types';
import {
  DashboardControlService,
  StudentDashboardConfig,
  DashboardAnnouncement,
  SpotlightLesson,
} from '../../services/dashboardControl';
import { AdminClassNode } from './adminTree';
import { Card, SectionHeader, inputClass, primaryButton, secondaryButton, Notify } from './adminUi';
import { classLabel } from '../../data/gamification';

interface StudentControlSectionProps {
  tree: AdminClassNode[];
  videos: Video[];
  notify: Notify;
}

type SubTab = 'announcement' | 'spotlight' | 'policy' | 'simulator';

export const StudentControlSection: React.FC<StudentControlSectionProps> = ({
  tree,
  videos,
  notify,
}) => {
  const [subTab, setSubTab] = useState<SubTab>('announcement');
  const [config, setConfig] = useState<StudentDashboardConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // Announcement Form State
  const [annActive, setAnnActive] = useState(true);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annTone, setAnnTone] = useState<'info' | 'warning' | 'success' | 'exam'>('exam');
  const [annTarget, setAnnTarget] = useState('all');
  const [annActionLabel, setAnnActionLabel] = useState('');
  const [annActionUrl, setAnnActionUrl] = useState('');

  // Spotlight Form State
  const [spotlightClass, setSpotlightClass] = useState('10');
  const [spotlightVideoId, setSpotlightVideoId] = useState('');
  const [spotlightNote, setSpotlightNote] = useState('');
  const [spotlightActive, setSpotlightActive] = useState(true);

  // Policy Form State
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [previewCount, setPreviewCount] = useState(1);
  const [guestNotes, setGuestNotes] = useState(false);

  // Simulator State
  const [simClass, setSimClass] = useState('10');

  // Load config on mount
  useEffect(() => {
    DashboardControlService.getConfig().then((cfg) => {
      setConfig(cfg);
      if (cfg.announcement) {
        setAnnActive(cfg.announcement.isActive);
        setAnnTitle(cfg.announcement.title);
        setAnnMessage(cfg.announcement.message);
        setAnnTone(cfg.announcement.tone);
        setAnnTarget(cfg.announcement.targetClass);
        setAnnActionLabel(cfg.announcement.actionLabel || '');
        setAnnActionUrl(cfg.announcement.actionUrl || '');
      }
      setPreviewEnabled(cfg.policy.freePreviewEnabled);
      setPreviewCount(cfg.policy.freePreviewCount);
      setGuestNotes(cfg.policy.allowGuestNotes);
    });
  }, []);

  // Update spotlight fields when selected grade changes
  useEffect(() => {
    if (!config) return;
    const existing = config.spotlights[spotlightClass];
    if (existing) {
      setSpotlightVideoId(existing.videoId);
      setSpotlightNote(existing.note);
      setSpotlightActive(existing.isActive);
    } else {
      const firstClassVideo = videos.find((v) => v.class_sort === spotlightClass && v.isActive);
      setSpotlightVideoId(firstClassVideo?.youtube_id || '');
      setSpotlightNote('Educator Spotlight: Core revision lesson for this week.');
      setSpotlightActive(true);
    }
  }, [spotlightClass, config, videos]);

  // Filter videos for the selected spotlight class
  const classVideos = useMemo(
    () => videos.filter((v) => v.class_sort === spotlightClass && v.isActive),
    [videos, spotlightClass]
  );

  const selectedSpotlightVideo = useMemo(
    () => videos.find((v) => v.youtube_id === spotlightVideoId),
    [videos, spotlightVideoId]
  );

  // Save Announcement
  const handleSaveAnnouncement = async () => {
    setSaving(true);
    try {
      const ann: DashboardAnnouncement = {
        id: config?.announcement?.id || `ann-${Date.now()}`,
        title: annTitle.trim() || 'Announcement',
        message: annMessage.trim(),
        tone: annTone,
        targetClass: annTarget,
        actionLabel: annActionLabel.trim() || undefined,
        actionUrl: annActionUrl.trim() || undefined,
        isActive: annActive,
        createdAt: Date.now(),
      };
      await DashboardControlService.setAnnouncement(ann);
      setConfig((prev) => (prev ? { ...prev, announcement: ann } : null));
      notify('Student Dashboard Announcement broadcast successfully!', 'success');
    } catch (err) {
      notify('Failed to publish announcement. Please retry.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save Spotlight
  const handleSaveSpotlight = async () => {
    if (!selectedSpotlightVideo) {
      notify('Please select a lesson to spotlight.', 'error');
      return;
    }
    setSaving(true);
    try {
      const spot: SpotlightLesson = {
        classSort: spotlightClass,
        videoId: selectedSpotlightVideo.youtube_id,
        title: selectedSpotlightVideo.video_title,
        subject: selectedSpotlightVideo.subject,
        chapterName: selectedSpotlightVideo.chapter_name,
        note: spotlightNote.trim(),
        isActive: spotlightActive,
        updatedAt: Date.now(),
      };
      await DashboardControlService.setSpotlight(spot);
      setConfig((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          spotlights: { ...prev.spotlights, [spotlightClass]: spot },
        };
      });
      notify(`Spotlight lesson updated for ${classLabel(spotlightClass)}!`, 'success');
    } catch (err) {
      notify('Failed to save spotlight lesson.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save Policy
  const handleSavePolicy = async () => {
    setSaving(true);
    try {
      await DashboardControlService.updatePolicy({
        freePreviewEnabled: previewEnabled,
        freePreviewCount: previewCount,
        allowGuestNotes: guestNotes,
      });
      setConfig((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          policy: {
            ...prev.policy,
            freePreviewEnabled: previewEnabled,
            freePreviewCount: previewCount,
            allowGuestNotes: guestNotes,
          },
        };
      });
      notify('Content access & preview policy saved!', 'success');
    } catch (err) {
      notify('Failed to save policy.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Tone badge styles
  const toneStyles = {
    // Matches the student banner (HomePage TONES): navy for Class 6–12; Class 1–5 get a sunny note instead.
    exam: 'bg-[#1E2233] border-[#2C3350] text-white',
    info: 'bg-[#EEF0FE]/80 border-[#C7CDF8] text-indigo-950',
    success: 'bg-[#E7F7F1]/80 border-[#A9E6D3] text-emerald-950',
    warning: 'bg-[#FFF6E2]/80 border-[#FFD97A] text-[#5E3D0C]',
  }[annTone];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Student Dashboard Control"
        description="Directly manage live announcements, spotlight revision lessons, and access rules that shape the student dashboard experience."
        actions={
          <a
            href="/app"
            target="_blank"
            rel="noreferrer"
            className={`${secondaryButton} gap-2 text-[#3B4FE0] hover:text-[#2F40BD]`}
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Student App</span>
          </a>
        }
      />

      {/* Sub navigation bar */}
      <div className="flex gap-2 border-b border-[#E3E5EC] pb-2 overflow-x-auto">
        {[
          { id: 'announcement', label: 'Broadcast Announcements', icon: Megaphone },
          { id: 'spotlight', label: 'Daily Spotlight Lessons', icon: Star },
          { id: 'policy', label: 'Content Access & Preview Policy', icon: Lock },
          { id: 'simulator', label: 'Live Dashboard Simulator', icon: Eye },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as SubTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-[14px] text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-[#3B4FE0] text-white shadow-[0_4px_0_#EDEFF6]'
                  : 'bg-white text-[#6B7280] hover:text-[#1E2233] border-2 border-[#E3E5EC]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. BROADCAST ANNOUNCEMENTS TAB */}
      {subTab === 'announcement' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E3E5EC] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#1E2233]">Broadcast Announcement</h3>
                <p className="text-xs text-[#6B7280]">Display a prominent announcement banner on student dashboards.</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-extrabold cursor-pointer">
                <input
                  type="checkbox"
                  checked={annActive}
                  onChange={(e) => setAnnActive(e.target.checked)}
                  className="rounded text-[#3B4FE0] focus:ring-[#3B4FE0]"
                />
                <span>Active</span>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-[#1E2233] mb-1">Headline</label>
                <input
                  type="text"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. CBSE Board Exam Sprint 2026–27"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#1E2233] mb-1">Message</label>
                <textarea
                  rows={3}
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                  placeholder="e.g. One-shot revision lectures, cheat sheets, and PYQ video solutions are live across all chapters."
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-[#1E2233] mb-1">Alert Style / Tone</label>
                  <select
                    value={annTone}
                    onChange={(e) => setAnnTone(e.target.value as any)}
                    className={inputClass}
                  >
                    <option value="exam">Exam Focus (High Visibility)</option>
                    <option value="info">Information (Indigo)</option>
                    <option value="success">Success / Milestone (Emerald)</option>
                    <option value="warning">Important Reminder (Amber)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#1E2233] mb-1">Target Audience</label>
                  <select
                    value={annTarget}
                    onChange={(e) => setAnnTarget(e.target.value)}
                    className={inputClass}
                  >
                    <option value="all">All Grades (Class 1–12)</option>
                    {tree.map((c) => (
                      <option key={c.class_sort} value={c.class_sort}>
                        {c.name} only
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-[#1E2233] mb-1">Action Button Text (Optional)</label>
                  <input
                    type="text"
                    value={annActionLabel}
                    onChange={(e) => setAnnActionLabel(e.target.value)}
                    placeholder="e.g. Browse Syllabus"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-[#1E2233] mb-1">Action Button Link</label>
                  <input
                    type="text"
                    value={annActionUrl}
                    onChange={(e) => setAnnActionUrl(e.target.value)}
                    placeholder="e.g. /app/subjects"
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                onClick={handleSaveAnnouncement}
                disabled={saving}
                className={`${primaryButton} w-full py-3`}
              >
                {saving ? 'Broadcasting...' : 'Publish to Student Dashboards'}
              </button>
            </div>
          </Card>

          {/* Interactive Live Preview Box */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#6B7280]">
                Live Student Dashboard Preview
              </span>
              <span className="text-[11px] font-bold text-[#0B7A67] bg-[#E7F7F1] px-2 py-0.5 rounded-md">
                Live Rendering
              </span>
            </div>

            <Card className="p-6 bg-[#F8F9FD] border-2 border-dashed border-[#CBD5E1] space-y-4">
              <p className="text-xs text-[#6B7280]">
                This is how the banner appears right below the greeting on the student dashboard:
                {annTone === 'exam' && ' Class 1–5 students see exam notices as a friendly yellow note instead.'}
              </p>

              {annActive ? (
                <div className={`p-4 rounded-[22px] border shadow-[0_4px_0_#EDEFF6] space-y-2 ${toneStyles}`}>
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-[14px] bg-white/80 shadow-[0_4px_0_#EDEFF6] flex items-center justify-center shrink-0">
                      <Megaphone className="w-4 h-4 text-[#3B4FE0]" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-extrabold">{annTitle || 'Announcement Title'}</p>
                        <span className={`text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded-md ${annTone === 'exam' ? 'bg-white/15' : 'bg-black/5'}`}>
                          {annTarget === 'all' ? 'All Classes' : classLabel(annTarget)}
                        </span>
                      </div>
                      <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
                        {annMessage || 'Your announcement message content will appear here.'}
                      </p>
                    </div>
                  </div>
                  {annActionLabel && (
                    <div className="pl-11 pt-1">
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#3B4FE0] bg-white px-3 py-1.5 rounded-xl border border-[#C7CDF8] shadow-[0_4px_0_#EDEFF6]">
                        {annActionLabel} <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[#6B7280] bg-white rounded-[22px] border-2 border-[#E3E5EC]">
                  Announcement is currently <strong>Inactive / Hidden</strong>. Turn on the toggle to display it.
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* 2. DAILY SPOTLIGHT / PINNED LESSONS TAB */}
      {subTab === 'spotlight' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E3E5EC] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#1E2233]">Spotlight / Pinned Lesson</h3>
                <p className="text-xs text-[#6B7280]">
                  Feature a high-yield revision lesson for students of a specific class.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-extrabold cursor-pointer">
                <input
                  type="checkbox"
                  checked={spotlightActive}
                  onChange={(e) => setSpotlightActive(e.target.checked)}
                  className="rounded text-[#3B4FE0] focus:ring-[#3B4FE0]"
                />
                <span>Active</span>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-[#1E2233] mb-1">Select Grade</label>
                <select
                  value={spotlightClass}
                  onChange={(e) => setSpotlightClass(e.target.value)}
                  className={inputClass}
                >
                  {tree.map((c) => (
                    <option key={c.class_sort} value={c.class_sort}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#1E2233] mb-1">
                  Choose Lesson to Feature ({classVideos.length} available)
                </label>
                <select
                  value={spotlightVideoId}
                  onChange={(e) => setSpotlightVideoId(e.target.value)}
                  className={inputClass}
                >
                  {classVideos.map((v) => (
                    <option key={v.youtube_id} value={v.youtube_id}>
                      {v.subject} · {v.chapter_name} ({v.video_title})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#1E2233] mb-1">
                  Teacher Guidance / Motivation Note
                </label>
                <textarea
                  rows={2}
                  value={spotlightNote}
                  onChange={(e) => setSpotlightNote(e.target.value)}
                  placeholder="e.g. High-yield concept: review balancing redox equations before Friday test."
                  className={inputClass}
                />
              </div>

              <button
                onClick={handleSaveSpotlight}
                disabled={saving}
                className={`${primaryButton} w-full py-3`}
              >
                {saving ? 'Saving...' : `Set Spotlight for ${classLabel(spotlightClass)}`}
              </button>
            </div>
          </Card>

          {/* Spotlight Preview Box */}
          <div className="space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#6B7280]">
              Spotlight Card Preview (Student Home)
            </span>

            <Card className="p-5 bg-gradient-to-br from-[#EEEDFE]/60 to-white border-2 border-[#D7D4FC] space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#3B4FE0] text-white shadow-[0_4px_0_#EDEFF6]">
                  <Star className="w-3.5 h-3.5 fill-white text-white" />
                  Educator&apos;s Pick for Today
                </span>
                <span className="text-xs font-bold text-[#6B7280]">
                  {classLabel(spotlightClass)}
                </span>
              </div>

              {selectedSpotlightVideo ? (
                <div className="space-y-2">
                  <p className="text-xs font-extrabold text-[#3B4FE0]">
                    {selectedSpotlightVideo.subject} · {selectedSpotlightVideo.chapter_name}
                  </p>
                  <h4 className="text-base font-extrabold text-[#1E2233] leading-snug">
                    {selectedSpotlightVideo.video_title}
                  </h4>
                  {spotlightNote && (
                    <p className="text-xs text-[#04342C] bg-[#E1F5EE] px-3 py-2 rounded-[14px] border-2 border-[#BCE8DC] flex items-center gap-1.5">
                      <Pin className="w-3.5 h-3.5 text-[#0B7A67] shrink-0" />
                      <span><strong>Note:</strong> {spotlightNote}</span>
                    </p>
                  )}
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-[14px] text-xs font-extrabold text-white bg-[#3B4FE0] shadow-[0_4px_0_#EDEFF6]">
                      <Play className="w-3.5 h-3.5 fill-white" /> Start Spotlight Lesson
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#6B7280]">No lesson selected.</p>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* 3. CONTENT ACCESS & PREVIEW POLICY TAB */}
      {subTab === 'policy' && (
        <div className="max-w-2xl space-y-6">
          <Card className="p-6 space-y-5">
            <div className="border-b border-[#E3E5EC] pb-3">
              <h3 className="text-base font-extrabold text-[#1E2233]">Content Access & Gating Policy</h3>
              <p className="text-xs text-[#6B7280]">
                Control what visitors can preview before being prompted to sign in with a free student account.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#F5F6FA] rounded-[22px] border-2 border-[#E3E5EC]">
                <div>
                  <p className="text-sm font-extrabold text-[#1E2233]">Free Sample Preview</p>
                  <p className="text-xs text-[#6B7280]">
                    Allow visitors to watch sample lessons to evaluate revision quality without barriers.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={previewEnabled}
                  onChange={(e) => setPreviewEnabled(e.target.checked)}
                  className="rounded text-[#3B4FE0] focus:ring-[#3B4FE0]"
                />
              </div>

              <div className="p-4 bg-[#F5F6FA] rounded-[22px] border-2 border-[#E3E5EC] space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="preview-count" className="text-sm font-extrabold text-[#1E2233]">Free preview chapters per subject</label>
                  <select
                    id="preview-count"
                    value={previewCount}
                    disabled={!previewEnabled}
                    onChange={(e) => setPreviewCount(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-xl border-2 border-[#E3E5EC] bg-white text-xs font-extrabold text-[#3B4FE0]"
                  >
                    {[1, 2, 3, 5].map((n) => (
                      <option key={n} value={n}>
                        {n === 1 ? 'Chapter 1 only' : `Chapters 1–${n}`}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-[#6B7280]">
                  Visitors can play the first lesson of these chapters without an account. Everything else asks them to sign up.
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#F5F6FA] rounded-[22px] border-2 border-[#E3E5EC]">
                <div>
                  <p className="text-sm font-extrabold text-[#1E2233]">Visitors can read notes of preview lessons</p>
                  <p className="text-xs text-[#6B7280]">
                    Off: notes and cheat sheets need a free account. Doubts always need a signed-in, consented account.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={guestNotes}
                  onChange={(e) => setGuestNotes(e.target.checked)}
                  className="rounded text-[#3B4FE0] focus:ring-[#3B4FE0]"
                />
              </div>

              <button onClick={handleSavePolicy} disabled={saving} className={`${primaryButton} w-full py-3`}>
                {saving ? 'Saving...' : 'Save Access Policy'}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* 4. LIVE DASHBOARD SIMULATOR TAB */}
      {subTab === 'simulator' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-[22px] border-2 border-[#E3E5EC]">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-[14px] bg-[#3B4FE0]/10 text-[#3B4FE0] flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#6B7280]">Simulation Mode</p>
                <p className="text-sm font-extrabold text-[#1E2233]">Viewing Student Dashboard for:</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={simClass}
                onChange={(e) => setSimClass(e.target.value)}
                className="px-3 py-1.5 text-xs font-extrabold rounded-[14px] border-2 border-[#E3E5EC] bg-white text-[#1E2233]"
              >
                {tree.map((c) => (
                  <option key={c.class_sort} value={c.class_sort}>
                    {c.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => notify(`Refreshed live simulator for ${classLabel(simClass)}!`, 'success')}
                className="p-2 rounded-[14px] border-2 border-[#E3E5EC] hover:bg-[#F5F6FA] text-[#6B7280] cursor-pointer"
                title="Refresh Simulator"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Simulated Student Workspace Frame */}
          <div className="border-4 border-slate-200 rounded-[28px] overflow-hidden bg-[#F5F6FA] p-4 sm:p-8 space-y-6 shadow-inner">
            <div className="flex items-center justify-between border-b border-[#E3E5EC] pb-3">
              <div>
                <span className="text-xs text-[#6B7280]">{classLabel(simClass)} · Student Workspace</span>
                <h3 className="text-xl font-extrabold text-[#1E2233]">Good afternoon, Student</h3>
              </div>
              <span className="text-xs font-extrabold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" /> 3-Day Streak
              </span>
            </div>

            {/* Simulated Live Announcement */}
            {config?.announcement?.isActive &&
              (config.announcement.targetClass === 'all' || config.announcement.targetClass === simClass) && (
                <div className={`p-4 rounded-[22px] border shadow-[0_4px_0_#EDEFF6] space-y-2 ${toneStyles}`}>
                  <div className="flex items-start gap-3">
                    <Megaphone className="w-5 h-5 text-[#3B4FE0] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-extrabold">{config.announcement.title}</p>
                      <p className="text-xs opacity-90 mt-0.5">{config.announcement.message}</p>
                    </div>
                  </div>
                </div>
              )}

            {/* Simulated Spotlight Lesson */}
            {config?.spotlights[simClass]?.isActive && (
              <div className="p-5 rounded-[22px] bg-white border-2 border-[#D7D4FC] shadow-[0_4px_0_#EDEFF6] space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-[#3B4FE0] text-white">
                  <Star className="w-3 h-3 fill-white text-white" /> Teacher&apos;s Spotlight for Today
                </span>
                <p className="text-xs text-[#3B4FE0] font-extrabold mt-1">
                  {config.spotlights[simClass].subject} · {config.spotlights[simClass].chapterName}
                </p>
                <h4 className="text-base font-extrabold text-[#1E2233]">{config.spotlights[simClass].title}</h4>
                {config.spotlights[simClass].note && (
                  <p className="text-xs text-[#04342C] bg-[#E1F5EE] p-2 rounded-[14px] flex items-center gap-1.5">
                    <Pin className="w-3.5 h-3.5 text-[#0B7A67] shrink-0" />
                    <span>{config.spotlights[simClass].note}</span>
                  </p>
                )}
              </div>
            )}

            {/* Subjects Grid for this Simulated Class */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#6B7280]">
                {classLabel(simClass)} Enrolled Subjects
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {tree
                  .find((c) => c.class_sort === simClass)
                  ?.subjects.map((s) => (
                    <div
                      key={s.name}
                      className="p-3 bg-white rounded-[14px] border-2 border-[#E3E5EC] shadow-[0_4px_0_#EDEFF6] space-y-1"
                    >
                      <p className="text-xs font-extrabold text-[#1E2233]">{s.name}</p>
                      <p className="text-[11px] text-[#6B7280]">
                        {s.chapters.length} chapters · {s.videoCount} lessons
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
