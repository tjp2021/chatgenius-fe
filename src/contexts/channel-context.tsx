'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { Channel } from '@/types/channel';
import { useChannels } from '@/hooks/useChannels';
import { useRouter } from 'next/navigation';

type ChannelContextType = {
  channels: Channel[];
  currentChannel: Channel | null;
  setCurrentChannel: (channel: Channel) => void;
  isLoading: boolean;
  error: string | null;
  joinChannel: (channelId: string) => Promise<void>;
  leaveChannel: (channelId: string, shouldDelete?: boolean) => Promise<void>;
  isJoining: boolean;
  isLeaving: boolean;
};

const ChannelContext = createContext<ChannelContextType | null>(null);

export const useChannelContext = () => {
  const context = useContext(ChannelContext);
  if (!context) throw new Error('useChannelContext must be used within ChannelProvider');
  return context;
};

export const ChannelProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const { 
    channels, 
    loading: isLoading, 
    error: queryError,
    joinChannel: joinChannelMutation,
    leaveChannel: leaveChannelMutation,
    isJoining,
    isLeaving
  } = useChannels();

  // Update current channel if it was modified
  if (currentChannel) {
    const updatedChannel = channels.find(ch => ch.id === currentChannel.id);
    if (!updatedChannel) {
      setCurrentChannel(null);
    } else if (JSON.stringify(updatedChannel) !== JSON.stringify(currentChannel)) {
      setCurrentChannel(updatedChannel);
    }
  }

  const joinChannel = useCallback(async (channelId: string) => {
    try {
      await joinChannelMutation(channelId);
      const channel = channels.find(ch => ch.id === channelId);
      if (channel) {
        setCurrentChannel(channel);
        router.push(`/channels/${channelId}`);
      }
    } catch (error) {
      console.error('Failed to join channel:', error);
      throw error;
    }
  }, [joinChannelMutation, channels, router]);

  const leaveChannel = useCallback(async (channelId: string, shouldDelete?: boolean) => {
    try {
      await leaveChannelMutation(channelId, shouldDelete);
      if (currentChannel?.id === channelId) {
        setCurrentChannel(null);
        router.push('/channels');
      }
    } catch (error) {
      console.error('Failed to leave channel:', error);
      throw error;
    }
  }, [leaveChannelMutation, currentChannel, router]);

  return (
    <ChannelContext.Provider 
      value={{ 
        channels, 
        currentChannel, 
        setCurrentChannel,
        isLoading,
        error: queryError ? queryError.toString() : null,
        joinChannel,
        leaveChannel,
        isJoining,
        isLeaving
      }}
    >
      {children}
    </ChannelContext.Provider>
  );
}; 