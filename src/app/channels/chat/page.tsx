'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ChannelType, Channel, OnlineUsers } from '@/types/channel';

export default function ChatPage() {
  const { getToken } = useAuth();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

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
        // Select the first channel by default
        if (data.channels.length > 0) {
          setSelectedChannel(data.channels[0].id);
        }
      } catch (error) {
        console.error('Error fetching channels:', error);
      }
    };

    fetchChannels();
  }, [getToken]);

  return (
    <div className="flex-1">
      {selectedChannel ? (
        <ChatWindow channelId={selectedChannel} />
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Select a channel to start chatting</p>
        </div>
      )}
    </div>
  );
} 