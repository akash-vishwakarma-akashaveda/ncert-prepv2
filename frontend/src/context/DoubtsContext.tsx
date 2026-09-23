import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Doubt } from '../types';
import { AskDoubtInput, DoubtsService } from '../services/content';
import { useAuth } from './AuthContext';

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
  const [myDoubts, setMyDoubts] = useState<Doubt[]>([]);

  useEffect(() => {
    if (!user) {
      setMyDoubts([]);
      return;
    }
    return DoubtsService.subscribeMine(user.userId, setMyDoubts);
  }, [user?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const askDoubt = useCallback(
    async (input: AskDoubtInput) => {
      if (!user) throw new Error('Sign in to ask a doubt.');
      await DoubtsService.ask(input, {
        userId: user.userId,
        userName: user.displayName || null,
        userEmail: user.email,
      });
    },
    [user]
  );

  const value = useMemo(
    () => ({
      myDoubts,
      unreadCount: myDoubts.filter((d) => d.student_unread).length,
      askDoubt,
      markRead: (doubt: Doubt) => DoubtsService.markRead(doubt),
      closeDoubt: (doubt: Doubt) => DoubtsService.closeByStudent(doubt),
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
