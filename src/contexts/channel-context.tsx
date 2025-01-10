'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { Channel } from '@/types/channel';
import { useAuth } from '@clerk/nextjs';

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
  const { getToken } = useAuth();

  const refreshChannels = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await getToken();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch channels');
      }
      const data = await response.json();
      setChannels(data);
      console.log('Channels refreshed:', data);
    } catch (err) {
      console.error('Error refreshing channels:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch channels'));
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  return (
    <ChannelContext.Provider value={{ 
      channels, 
      isLoading, 
      error, 
      refreshChannels
    }}>
      {children}
    </ChannelContext.Provider>
  );
};

export const useChannelContext = () => useContext(ChannelContext); 