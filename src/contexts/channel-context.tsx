'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useApi } from '@/hooks/useApi';
import { Channel, ChannelType } from '@/types/channel';
import { useSocket } from '@/hooks/useSocket';

interface ChannelContextType {
  channels: Channel[];
  publicChannels: Channel[];
  privateChannels: Channel[];
  directMessages: Channel[];
  selectedChannel: Channel | null;
  isLoading: boolean;
  error: Error | null;
  refreshChannels: () => Promise<void>;
  joinChannel: (channelId: string) => Promise<void>;
  leaveChannel: (channelId: string) => Promise<void>;
  selectChannel: (channelId: string) => void;
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

export function ChannelProvider({ children }: { children: React.ReactNode }) {
  const { userId, getToken } = useAuth();
  const { socket } = useSocket();
  const { joinChannel, leaveChannel } = useApi();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refreshChannels = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      if (!token) throw new Error('No auth token available');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to refresh channels');
      const data = await response.json();
      setChannels(data);
    } catch (error) {
      console.error('Error refreshing channels:', error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectChannel = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    setSelectedChannel(channel || null);
  };

  useEffect(() => {
    if (userId) {
      refreshChannels();
    }
  }, [userId]);

  useEffect(() => {
    if (!socket) return;

    const handleChannelUpdate = () => {
      refreshChannels();
    };

    socket.on('channel:created', handleChannelUpdate);
    socket.on('channel:updated', handleChannelUpdate);
    socket.on('channel:deleted', handleChannelUpdate);
    socket.on('channel:member_joined', handleChannelUpdate);
    socket.on('channel:member_left', handleChannelUpdate);

    return () => {
      socket.off('channel:created', handleChannelUpdate);
      socket.off('channel:updated', handleChannelUpdate);
      socket.off('channel:deleted', handleChannelUpdate);
      socket.off('channel:member_joined', handleChannelUpdate);
      socket.off('channel:member_left', handleChannelUpdate);
    };
  }, [socket]);

  const publicChannels = channels.filter(channel => channel.type === ChannelType.PUBLIC);
  const privateChannels = channels.filter(channel => channel.type === ChannelType.PRIVATE);
  const directMessages = channels.filter(channel => channel.type === ChannelType.DM);

  return (
    <ChannelContext.Provider
      value={{
        channels,
        publicChannels,
        privateChannels,
        directMessages,
        selectedChannel,
        isLoading,
        error,
        refreshChannels,
        joinChannel,
        leaveChannel,
        selectChannel,
      }}
    >
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