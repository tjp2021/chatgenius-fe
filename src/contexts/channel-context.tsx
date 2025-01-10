'use client';

import { createContext, useContext, useEffect } from 'react';
import { useChannels } from '@/hooks/useChannels';
import type { Channel } from '@/types/channel';

interface ChannelContextType {
  channels: Channel[];
  isLoading: boolean;
  joinChannel: (channelId: string) => Promise<any>;
  leaveChannel: (channelId: string) => Promise<any>;
}

const ChannelContext = createContext<ChannelContextType | null>(null);

export const useChannelContext = () => {
  const context = useContext(ChannelContext);
  if (!context) {
    throw new Error('useChannelContext must be used within a ChannelProvider');
  }
  return context;
};

export function ChannelProvider({ children }: { children: React.ReactNode }) {
  const { channels, isLoading, joinChannel, leaveChannel } = useChannels();

  // Debug log when channels update
  useEffect(() => {
    console.log('Channel context value updated:', { channels, isLoading });
  }, [channels, isLoading]);

  return (
    <ChannelContext.Provider value={{
      channels,
      isLoading,
      joinChannel,
      leaveChannel
    }}>
      {children}
    </ChannelContext.Provider>
  );
} 