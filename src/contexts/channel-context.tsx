'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { Channel, ChannelType } from '@/types/channel';
import { useAuth } from '@clerk/nextjs';
import React from 'react';
import { useSocket } from '@/providers/socket-provider';
import { api } from '@/lib/axios';

interface ChannelContextType {
  channels: Channel[];
  isLoading: boolean;
  selectedChannel: string | null;
  setSelectedChannel: (channelId: string | null) => void;
  leaveChannel: (channelId: string) => Promise<void>;
  joinChannel: (channelId: string) => Promise<void>;
  refreshChannels: () => Promise<void>;
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

export function ChannelProvider({ children }: { children: React.ReactNode }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const { socket } = useSocket();

  const fetchChannels = async () => {
    if (!isLoaded || !isSignedIn) {
      console.log('[ChannelContext] Not ready:', { isLoaded, isSignedIn });
      setIsLoading(false);
      return;
    }

    try {
      // Try to get a token first to ensure auth is ready
      const token = await getToken();
      if (!token) {
        console.log('[ChannelContext] No token yet, skipping fetch');
        return;
      }

      console.log('[ChannelContext] Fetching channels...');
      const response = await api.get('/channels?view=sidebar');
      console.log('[ChannelContext] Got channels:', response.data);
      setChannels(response.data);
    } catch (error) {
      console.error('[ChannelContext] Failed to fetch channels:', error);
      // Don't throw error on landing page
      setChannels([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [isLoaded, isSignedIn, getToken]);

  const refreshChannels = async () => {
    await fetchChannels();
  };

  const leaveChannel = async (channelId: string) => {
    try {
      console.log('[ChannelContext] Leaving channel:', channelId);
      const response = await api.delete(`/channels/${channelId}/leave`);
      console.log('[ChannelContext] Leave channel response:', response.data);
      
      // Emit socket event
      if (socket && socket.connected) {
        socket.emit('channel:leave', { channelId });
      }
      
      if (response.data.wasDeleted) {
        setChannels(prev => prev.filter(channel => channel.id !== channelId));
      }
      
      if (selectedChannel === channelId) {
        setSelectedChannel(null);
      }

      await refreshChannels();
    } catch (error) {
      console.error('[ChannelContext] Error leaving channel:', error);
      throw error;
    }
  };

  const joinChannel = async (channelId: string) => {
    try {
      const response = await api.post(`/channels/${channelId}/join`);
      const { channel } = response.data;
      
      setChannels(prev => {
        const filtered = prev.filter(c => c.id !== channelId);
        return [...filtered, channel];
      });

      await refreshChannels();
      return channel;
    } catch (error) {
      console.error('[ChannelContext] Error joining channel:', error);
      throw error;
    }
  };

  // Add socket event handlers
  React.useEffect(() => {
    if (!socket) return;

    const handleChannelCreated = (data: any) => {
      console.log('[Channel] Created:', data);
      fetchChannels();
    };

    const handleChannelUpdated = (data: any) => {
      console.log('[Channel] Updated:', data);
      fetchChannels();
    };

    const handleChannelDeleted = (data: any) => {
      console.log('[Channel] Deleted:', data);
      fetchChannels();
    };

    socket.on('channel.created', handleChannelCreated);
    socket.on('channel.updated', handleChannelUpdated);
    socket.on('channel.deleted', handleChannelDeleted);

    return () => {
      socket.off('channel.created', handleChannelCreated);
      socket.off('channel.updated', handleChannelUpdated);
      socket.off('channel.deleted', handleChannelDeleted);
    };
  }, [socket, fetchChannels]);

  return (
    <ChannelContext.Provider value={{
      channels,
      isLoading,
      selectedChannel,
      setSelectedChannel,
      leaveChannel,
      joinChannel,
      refreshChannels
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