'use client';

import { createContext, useContext, useMemo } from 'react';

const ConversationContext = createContext<string>('');

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const conversationId = useMemo(() => crypto.randomUUID(), []);
  return (
    <ConversationContext.Provider value={conversationId}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversationId() {
  return useContext(ConversationContext);
}
