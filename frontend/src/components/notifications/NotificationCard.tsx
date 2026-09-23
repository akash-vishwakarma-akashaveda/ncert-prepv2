import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  X,
  MessageCircleQuestion,
  Megaphone,
  Flame,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDoubts } from '../../context/DoubtsContext';
import { useDashboardConfig } from '../../hooks/useDashboardConfig';
import { currentStreak } from '../../data/gamification';
import { Mascot, useStage } from '../../student/stage';

interface NotificationCardProps {
  isOpen: boolean;
  onClose: () => void;
  adminOpenDoubts?: number;
  adminFeedbackCount?: number;
}

export interface NotificationItem {
  id: string;
  type: 'doubt_reply' | 'announcement' | 'streak' | 'reminder' | 'admin_doubt' | 'admin_feedback';
  title: string;
  message: string;
  timestamp?: number;
  unread: boolean;
  actionUrl: string;
  badgeLabel?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  onClick?: () => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  isOpen,
  onClose,
  adminOpenDoubts = 0,
  adminFeedbackCount = 0,
}) => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { myDoubts, unreadCount, markRead } = useDoubts();
  const { config } = useDashboardConfig();
  const cardRef = useRef<HTMLDivElement>(null);
  const stage = useStage();

  // Close on Escape or outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      // The wrapper also holds the bell button, which toggles the card itself.
      const area = cardRef.current?.parentElement ?? cardRef.current;
      if (area && !area.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Slight timeout so the opening click doesn't trigger outside click immediately
    const timeout = setTimeout(() => {
      window.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const streak = user ? currentStreak(user) : 0;
  const notifications: NotificationItem[] = [];

  // 1. Admin notifications
  if (isAdmin) {
    if (adminOpenDoubts > 0) {
      notifications.push({
        id: 'admin_open_doubts',
        type: 'admin_doubt',
        title: `${adminOpenDoubts} student doubt${adminOpenDoubts > 1 ? 's' : ''} awaiting reply`,
        message: 'Students have asked questions under lesson videos that require educator answers.',
        unread: true,
        actionUrl: '/app?tab=doubts',
        badgeLabel: 'Action Required',
        icon: MessageCircleQuestion,
        iconBg: 'bg-[#FFF0CF]',
        iconColor: 'text-[#B87A06]',
      });
    }

    if (adminFeedbackCount > 0) {
      notifications.push({
        id: 'admin_feedback',
        type: 'admin_feedback',
        title: `${adminFeedbackCount} student feedback submission${adminFeedbackCount > 1 ? 's' : ''}`,
        message: 'New ratings and issue reports received from students.',
        unread: true,
        actionUrl: '/app?tab=feedback',
        badgeLabel: 'New',
        icon: MessageSquare,
        iconBg: 'bg-[#E7F7F1]',
        iconColor: 'text-[#0B7A67]',
      });
    }
  }

  // 2. Student Doubt Replies
  if (!isAdmin && myDoubts.length > 0) {
    // Collect doubts with teacher replies
    const answeredOrUnread = myDoubts.filter((d) => d.status === 'answered' || d.student_unread);
    answeredOrUnread.forEach((d) => {
      notifications.push({
        id: `doubt_${d.id}`,
        type: 'doubt_reply',
        title: d.student_unread ? 'Teacher replied to your doubt!' : `Doubt: ${d.question.slice(0, 45)}…`,
        message: d.answer ? `"${d.answer.slice(0, 90)}${d.answer.length > 90 ? '…' : ''}"` : 'Your educator has reviewed and answered your question.',
        timestamp: d.answered_at || d.updated_at,
        unread: d.student_unread,
        actionUrl: `/app/lesson/${encodeURIComponent(d.youtube_id)}`,
        badgeLabel: d.student_unread ? 'New reply' : undefined,
        icon: MessageCircleQuestion,
        iconBg: d.student_unread ? 'bg-[#FFE8E0]' : 'bg-[#E7F7F1]',
        iconColor: d.student_unread ? 'text-[#E0603F]' : 'text-[#0B7A67]',
        onClick: () => {
          markRead(d).catch(() => undefined);
        },
      });
    });
  }

  // 3. Class Announcement Notification
  const ann = config?.announcement;
  const userClass = user?.grade_preference || '';
  const isTargetClass =
    ann?.isActive &&
    (ann.targetClass === 'all' ||
      ann.targetClass === userClass ||
      (userClass && parseInt(userClass.replace(/\D/g, ''), 10) === parseInt(ann.targetClass.replace(/\D/g, ''), 10)));

  if (isTargetClass && ann) {
    const toneIcon =
      ann.tone === 'exam'
        ? Sparkles
        : ann.tone === 'warning'
        ? AlertTriangle
        : ann.tone === 'success'
        ? CheckCircle2
        : Megaphone;

    notifications.push({
      id: `announcement_${ann.title}`,
      type: 'announcement',
      title: ann.title,
      message: ann.message,
      // No read tracking for announcements, so they never count as "new" (the bell only counts real replies).
      unread: false,
      actionUrl: ann.actionUrl || '/app',
      badgeLabel: ann.tone.toUpperCase(),
      icon: toneIcon,
      iconBg: ann.tone === 'exam' ? 'bg-[#FFF0CF]' : 'bg-[#E0F1FF]',
      iconColor: ann.tone === 'exam' ? 'text-[#B87A06]' : 'text-[#1E7FCB]',
    });
  }

  // 4. Streak Milestone Notification
  if (!isAdmin && streak >= 3) {
    notifications.push({
      id: 'streak_milestone',
      type: 'streak',
      title: `${streak}-Day Study Streak Active!`,
      message: 'You are consistently studying! Keep your daily streak alive to earn bonus XP.',
      unread: false,
      actionUrl: '/app/leaderboard',
      badgeLabel: 'Streak',
      icon: Flame,
      iconBg: 'bg-[#FFE8E0]',
      iconColor: 'text-[#FF7A59]',
    });
  }

  // 5. Reminder Settings Status
  if (user && user.reminders_enabled) {
    notifications.push({
      id: 'reminder_active',
      type: 'reminder',
      title: 'Study Reminder Scheduled',
      message: `Friendly email reminders set for ${user.reminder_hour || 19}:00 IST (${user.reminder_frequency || 'weekly'}).`,
      unread: false,
      actionUrl: '/app/reminders',
      icon: Clock,
      iconBg: 'bg-[#F0E9FF]',
      iconColor: 'text-[#6D3FE0]',
    });
  }

  const unreadTotal = notifications.filter((n) => n.unread).length;

  const handleMarkAllRead = async () => {
    const unreadDoubts = myDoubts.filter((d) => d.student_unread);
    for (const d of unreadDoubts) {
      await markRead(d).catch(() => undefined);
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    if (item.onClick) item.onClick();
    onClose();
    navigate(item.actionUrl);
  };

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Notifications popover"
      className="fixed inset-x-3 top-[68px] sm:absolute sm:inset-x-auto sm:right-0 sm:top-14 sm:w-[400px] bg-white rounded-[24px] border-[3px] border-[color:var(--card-line)] shadow-[0_5px_0_var(--card-line),0_18px_40px_rgba(30,34,51,0.2)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Popover Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3.5 border-b-2 border-[color:var(--card-line)] bg-[color:var(--page)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 shrink-0 rounded-[12px] bg-[color:var(--brand-soft)] text-[color:var(--brand)] flex items-center justify-center">
            <Bell className="w-4 h-4" strokeWidth={2.5} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-display text-[#1E2233]">Notifications</h3>
              {unreadTotal > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#FF7A59] text-white text-[10px] font-black">
                  {unreadTotal} new
                </span>
              )}
            </div>
            <p className="text-[11px] font-semibold text-[#6B7280]">
              {isAdmin ? 'Educator alerts & doubts' : 'Updates, doubt replies & notices'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && !isAdmin && (
            <button
              onClick={handleMarkAllRead}
              title="Mark all as read"
              className="px-2 py-1.5 rounded-xl text-[11px] font-extrabold text-[color:var(--brand)] hover:bg-[color:var(--brand-soft)] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark read</span>
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close notifications"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#6B7280] hover:bg-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[min(380px,60vh)] overflow-y-auto divide-y-2 divide-[#F4F5F9]">
        {notifications.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            {stage === 'primary' ? (
              <Mascot className="mx-auto w-16 animate-bob" />
            ) : (
              <span className="w-12 h-12 rounded-2xl bg-[#E7F7F1] mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-[#12A594]" />
              </span>
            )}
            <p className="text-sm font-display text-[#1E2233]">You're all caught up!</p>
            <p className="text-xs font-semibold text-[#6B7280]">
              No unread doubt replies or alerts right now.
            </p>
          </div>
        ) : (
          notifications.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`relative w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-[color:var(--page)] ${
                  item.unread ? 'bg-[color:var(--brand-soft)]/40' : ''
                }`}
              >
                {item.unread && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#FF7A59]" aria-label="Unread" />}
                <div className={`w-10 h-10 rounded-[13px] ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}>
                  <Icon className="w-[18px] h-[18px]" strokeWidth={2.4} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-[13px] font-extrabold text-[#1E2233] leading-snug line-clamp-2">
                      {item.title}
                    </h4>
                    {item.badgeLabel && (
                      <span className="shrink-0 text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#FFF0CF] text-[#8A5A14]">
                        {item.badgeLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] font-semibold text-[#4B5168] mt-0.5 line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-[#9AA1B4] shrink-0 self-center" />
              </button>
            );
          })
        )}
      </div>

      {/* Popover Footer */}
      <div className="px-4 py-3 border-t-2 border-[color:var(--card-line)] bg-[color:var(--page)] flex items-center justify-between gap-3 text-xs font-extrabold text-[#6B7280]">
        <button
          onClick={() => {
            onClose();
            navigate(isAdmin ? '/app?tab=doubts' : '/app/doubts');
          }}
          className="hover:text-[color:var(--brand)] transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>{isAdmin ? 'All student doubts' : 'View all doubts'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            onClose();
            navigate('/app/reminders');
          }}
          className="hover:text-[color:var(--brand)] transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>Reminder settings</span>
        </button>
      </div>
    </div>
  );
};
