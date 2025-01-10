'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useSocket as useSocketHook } from '@/hooks/useSocket';

const SocketContext = createContext<ReturnType<typeof useSocketHook> | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socket = useSocketHook();

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}