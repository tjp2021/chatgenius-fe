'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { Channel, ChannelType } from '@/types/channel';
import { useAuth } from '@clerk/nextjs';
import React from 'react';
import { useSocket } from '@/providers/socket-provider';

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
  const { getToken } = useAuth();
  const { socket } = useSocket();

  const fetchChannels = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels?view=sidebar`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ChannelContext] Failed to fetch channels:', {
          status: response.status,
          statusText: response.statusText,
          responseText: errorText
        });
        throw new Error('Failed to fetch channels');
      }

      const data = await response.json();
      console.log('[ChannelContext] Got channels:', data);
      // The API returns an array directly, not wrapped in a channels property
      setChannels(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[ChannelContext] Error fetching channels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [getToken]);

  const refreshChannels = async () => {
    await fetchChannels();
  };

  const leaveChannel = async (channelId: string) => {
    try {
      console.log('[ChannelContext] Leaving channel:', channelId);
      const token = await getToken();
      if (!token) throw new Error('No auth token available');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels/${channelId}/leave`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('[ChannelContext] Leave channel error:', errorData);
        throw new Error(errorData?.message || 'Failed to leave channel');
      }

      const data = await response.json();
      console.log('[ChannelContext] Leave channel response:', data);
      
      // Emit socket event
      if (socket && socket.connected) {
        socket.emit('channel:leave', { channelId });
      }
      
      if (data.wasDeleted) {
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
      const token = await getToken();
      if (!token) throw new Error('No auth token available');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels/${channelId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to join channel');

      const { channel } = await response.json();
      
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

    socket.onChannelCreated(handleChannelCreated);
    socket.onChannelUpdated(handleChannelUpdated);
    socket.onChannelDeleted(handleChannelDeleted);

    return () => {
      socket.offChannelCreated(handleChannelCreated);
      socket.offChannelUpdated(handleChannelUpdated);
      socket.offChannelDeleted(handleChannelDeleted);
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