'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ChatLayout } from '@/components/chat/chat-layout';
import { ChannelType, ChannelWithDetails, OnlineUsers } from '@/types/channel';

type ChannelsByType = {
  [K in Lowercase<keyof typeof ChannelType>]: ChannelWithDetails[];
};

export default function ChatPage() {
  const { getToken } = useAuth();
  const [channels, setChannels] = useState<ChannelsByType>({
    public: [],
    private: [],
    dm: [],
  });
  const [onlineUsers, setOnlineUsers] = useState<OnlineUsers>({});

  // Fetch channels
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) throw new Error('Failed to fetch channels');
        
        const data = await response.json();
        setChannels({
          public: data.filter((channel: ChannelWithDetails) => channel.type === ChannelType.PUBLIC),
          private: data.filter((channel: ChannelWithDetails) => channel.type === ChannelType.PRIVATE),
          dm: data.filter((channel: ChannelWithDetails) => channel.type === ChannelType.DM),
        });
      } catch (error) {
        console.error('Error fetching channels:', error);
      }
    };

    fetchChannels();
  }, [getToken]);

  // Handle joining a channel
  const handleJoinChannel = async (channelId: string, type: ChannelType) => {
    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels/${channelId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to join channel');

      // Refresh channels after joining
      const updatedChannel = await response.json();
      const channelType = type.toLowerCase() as keyof ChannelsByType;
      setChannels(prev => ({
        ...prev,
        [channelType]: prev[channelType].map(channel =>
          channel.id === channelId ? updatedChannel : channel
        ),
      }));
    } catch (error) {
      console.error('Error joining channel:', error);
    }
  };

  // Handle leaving a channel
  const handleLeaveChannel = async (channelId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels/${channelId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to leave channel');

      // Refresh channels after leaving
      const updatedChannel = await response.json();
      setChannels(prev => ({
        public: prev.public.map(channel =>
          channel.id === channelId ? updatedChannel : channel
        ),
        private: prev.private.map(channel =>
          channel.id === channelId ? updatedChannel : channel
        ),
        dm: prev.dm.map(channel =>
          channel.id === channelId ? updatedChannel : channel
        ),
      }));
    } catch (error) {
      console.error('Error leaving channel:', error);
    }
  };

  return (
    <ChatLayout
      publicChannels={channels.public}
      privateChannels={channels.private}
      directMessages={channels.dm}
      onlineUsers={onlineUsers}
      onJoinChannel={handleJoinChannel}
      onLeaveChannel={handleLeaveChannel}
    />
  );
} 