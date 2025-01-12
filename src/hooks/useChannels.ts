'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import type { Channel } from '@/types/channel';

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const token = await getToken();
        const response = await fetch('/channels', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch channels');
        const data = await response.json();
        setChannels(data);
      } catch (error) {
        setError(error instanceof Error ? error : new Error('Failed to fetch channels'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchChannels();
  }, [getToken]);

  const joinChannel = async (channelId: string): Promise<Channel> => {
    try {
      const token = await getToken();
      const response = await fetch(`/channels/${channelId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to join channel');
      const data = await response.json();
      setChannels(prev => [...prev, data]);
      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to join channel');
    }
  };

  const leaveChannel = async (channelId: string): Promise<void> => {
    try {
      const token = await getToken();
      const response = await fetch(`/channels/${channelId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to leave channel');
      setChannels(prev => prev.filter(channel => channel.id !== channelId));
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to leave channel');
    }
  };

  return {
    channels,
    isLoading,
    error,
    joinChannel,
    leaveChannel
  };
} 