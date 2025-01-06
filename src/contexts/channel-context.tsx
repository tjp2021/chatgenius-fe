'use client';

import { createContext, useContext, useState } from 'react';
import { Channel } from '@/types/channel';

type ChannelContextType = {
  channels: Channel[];
  currentChannel: Channel | null;
  setCurrentChannel: (channel: Channel) => void;
  refreshChannels: () => Promise<void>;
};

const ChannelContext = createContext<ChannelContextType | null>(null);

export const useChannels = () => {
  const context = useContext(ChannelContext);
  if (!context) throw new Error('useChannels must be used within ChannelProvider');
  return context;
};

export const ChannelProvider = ({ children }: { children: React.ReactNode }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);

  const refreshChannels = async () => {
    // Implementation will be similar to your channel-list.tsx fetch logic
  };

  return (
    <ChannelContext.Provider 
      value={{ 
        channels, 
        currentChannel, 
        setCurrentChannel,
        refreshChannels 
      }}
    >
      {children}
    </ChannelContext.Provider>
  );
}; 