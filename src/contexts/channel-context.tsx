'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { Channel } from '@/types/channel';

interface ChannelContextType {
  channels: Channel[];
  isLoading: boolean;
  error: Error | null;
  refreshChannels: () => Promise<void>;
}

const ChannelContext = createContext<ChannelContextType>({
  channels: [],
  isLoading: false,
  error: null,
  refreshChannels: async () => {},
});

export const ChannelProvider = ({ children }: { children: React.ReactNode }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refreshChannels = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/channels');
      if (!response.ok) {
        throw new Error('Failed to fetch channels');
      }
      const data = await response.json();
      setChannels(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch channels'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <ChannelContext.Provider value={{ channels, isLoading, error, refreshChannels }}>
      {children}
    </ChannelContext.Provider>
  );
};

export const useChannelContext = () => useContext(ChannelContext); 