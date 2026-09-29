import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MessageCircleQuestion } from 'lucide-react';
import { Doubt } from '../types';
import { AskDoubtInput, DoubtsService } from '../services/content';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';
import { useAppToast } from './ToastContext';

interface DoubtsContextType {
  myDoubts: Doubt[];
  unreadCount: number;
  askDoubt: (input: AskDoubtInput) => Promise<void>;
  markRead: (doubt: Doubt) => Promise<void>;
  closeDoubt: (doubt: Doubt) => Promise<void>;
}

const DoubtsContext = createContext<DoubtsContextType | undefined>(undefined);

export const DoubtsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { pushToast } = useAppToast();
  const [myDoubts, setMyDoubts] = useState<Doubt[]>([]);

  useEffect(() => {
    if (!user) {
      setMyDoubts([]);
      return;
    }
    let cancelled = false;
    DoubtsService.fetchMine().then((rows) => {
      if (!cancelled) setMyDoubts(rows);
    });

    // Live updates when an educator replies — the socket authenticates off the session cookie
    // and the server puts this connection in a room named after this user's id.
    const socket = getSocket();
    const onAnswered = (updated: Doubt) => {
      setMyDoubts((prev) => (prev.some((d) => d.id === updated.id) ? prev.map((d) => (d.id === updated.id ? updated : d)) : [updated, ...prev]));
      pushToast({
        title: 'Teacher replied to your doubt!',
        message: updated.answer ? `"${updated.answer.slice(0, 90)}${updated.answer.length > 90 ? '…' : ''}"` : 'Your question has been answered.',
        icon: MessageCircleQuestion,
        iconBg: 'bg-[#FFE8E0]',
        iconColor: 'text-[#E0603F]',
        actionUrl: `/app/lesson/${encodeURIComponent(updated.youtube_id)}`,
      });
    };
    // Status changes (closed by an educator, etc.) — refresh the row quietly, no toast.
    const onUpdated = (updated: Doubt) => setMyDoubts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    socket.on('doubt:answered', onAnswered);
    socket.on('doubt:updated', onUpdated);
    socket.connect();

    return () => {
      cancelled = true;
      socket.off('doubt:answered', onAnswered);
      socket.off('doubt:updated', onUpdated);
      socket.disconnect();
    };
  }, [user?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const askDoubt = useCallback(
    async (input: AskDoubtInput) => {
      if (!user) throw new Error('Sign in to ask a doubt.');
      await DoubtsService.ask(input, {
        userId: user.userId,
        userName: user.displayName || null,
        userEmail: user.email,
      });
      const rows = await DoubtsService.fetchMine();
      setMyDoubts(rows);
    },
    [user]
  );

  const value = useMemo(
    () => ({
      myDoubts,
      unreadCount: myDoubts.filter((d) => d.student_unread).length,
      askDoubt,
      markRead: async (doubt: Doubt) => {
        await DoubtsService.markRead(doubt);
        setMyDoubts((prev) => prev.map((d) => (d.id === doubt.id ? { ...d, student_unread: false } : d)));
      },
      closeDoubt: async (doubt: Doubt) => {
        await DoubtsService.closeByStudent(doubt);
        setMyDoubts((prev) => prev.map((d) => (d.id === doubt.id ? { ...d, status: 'closed', student_unread: false } : d)));
      },
    }),
    [myDoubts, askDoubt]
  );

  return <DoubtsContext.Provider value={value}>{children}</DoubtsContext.Provider>;
};

export const useDoubts = (): DoubtsContextType => {
  const ctx = useContext(DoubtsContext);
  if (!ctx) throw new Error('useDoubts must be used within a DoubtsProvider');
  return ctx;
};
