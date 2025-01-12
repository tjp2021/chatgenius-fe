'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { Channel, ChannelType } from '@/types/channel';
import { useAuth } from '@clerk/nextjs';

interface ChannelContextType {
  channels: Channel[];
  isLoading: boolean;
  selectedChannel: string | null;
  setSelectedChannel: (channelId: string | null) => void;
  leaveChannel: (channelId: string) => Promise<void>;
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

export function ChannelProvider({ children }: { children: React.ReactNode }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Failed to fetch channels');

        const data = await response.json();
        setChannels(data);
      } catch (error) {
        console.error('Error fetching channels:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChannels();
  }, [getToken]);

  const leaveChannel = async (channelId: string) => {
    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token available');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels/${channelId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to leave channel');

      // Remove channel from local state
      setChannels(prev => prev.filter(channel => channel.id !== channelId));
      
      // If this was the selected channel, clear the selection
      if (selectedChannel === channelId) {
        setSelectedChannel(null);
      }
    } catch (error) {
      console.error('Error leaving channel:', error);
      throw error;
    }
  };

  return (
    <ChannelContext.Provider value={{
      channels,
      isLoading,
      selectedChannel,
      setSelectedChannel,
      leaveChannel
    }}>
      {children}
    </ChannelContext.Provider>
  );
}

export function useChannelContext() {
  const context = useContext(ChannelContext);
  if (!context) {
    throw new Error('useChannelContext must be used within a ChannelProvider');
  }
  return context;
} 