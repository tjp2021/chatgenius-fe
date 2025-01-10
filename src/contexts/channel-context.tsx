'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useSocket } from '@/providers/socket-provider';
import { useToast } from '@/components/ui/use-toast';
import { Channel } from '@/types/channel';

interface ChannelContextType {
  channels: Channel[];
  isLoading: boolean;
  error: Error | null;
  refreshChannels: () => Promise<void>;
  joinChannel: (channelId: string) => Promise<void>;
  leaveChannel: (channelId: string) => Promise<void>;
}

const ChannelContext = createContext<ChannelContextType>({
  channels: [],
  isLoading: false,
  error: null,
  refreshChannels: async () => {},
  joinChannel: async () => {},
  leaveChannel: async () => {},
});

export const ChannelProvider = ({ children }: { children: React.ReactNode }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { getToken, userId } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();

  const refreshChannels = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/channels?include=members.user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch channels');
      }
      const data = await response.json();
      
      // Only include channels where the user is a member
      const userChannels = data.filter((channel: Channel) => 
        channel.members?.some(member => member.userId === userId)
      );
      
      setChannels(userChannels);
    } catch (err) {
      console.error('Error refreshing channels:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch channels'));
    } finally {
      setIsLoading(false);
    }
  }, [getToken, userId]);

  const joinChannel = useCallback(async (channelId: string) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/channels/${channelId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to join channel');
      }

      // Immediately refresh channels to update the UI
      await refreshChannels();
    } catch (err) {
      console.error('Error joining channel:', err);
      throw err;
    }
  }, [refreshChannels, getToken]);

  const leaveChannel = useCallback(async (channelId: string) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/channels/${channelId}/leave?shouldDelete=false`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to leave channel');
      }

      // Immediately refresh channels to update the UI
      await refreshChannels();
    } catch (err) {
      console.error('Error leaving channel:', err);
      throw err;
    }
  }, [refreshChannels, getToken]);

  // Handle socket events for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleChannelEvent = (event: any) => {
      console.log('Channel event received:', event);
      
      if (event.error) {
        toast({
          title: 'Channel Error',
          description: event.error,
          variant: 'destructive'
        });
        return;
      }

      // Handle different event types
      if (event.type === 'member_left') {
        setChannels(prev => {
          // If current user left, remove the channel
          if (event.userId === userId) {
            return prev.filter(ch => ch.id !== event.channelId);
          }
          // If another user left, update the members list
          return prev.map(ch => {
            if (ch.id === event.channelId) {
              return {
                ...ch,
                members: (ch.members || []).filter((m: { userId: string }) => m.userId !== event.userId),
                _count: {
                  ...ch._count,
                  members: (ch._count?.members || 1) - 1
                }
              };
            }
            return ch;
          });
        });
        return;
      }

      if (event.type === 'member_joined') {
        setChannels(prev => {
          return prev.map(ch => {
            if (ch.id === event.channelId && event.member) {
              return {
                ...ch,
                members: [...(ch.members || []), event.member],
                _count: {
                  ...ch._count,
                  members: (ch._count?.members || 0) + 1
                }
              };
            }
            return ch;
          });
        });
        return;
      }

      // For channel updates (created, updated) or any other channel event with channel data
      if (event.channel) {
        setChannels(prev => {
          // Only add/update channel if the current user is a member
          const isMember = event.channel.members?.some((member: { userId: string }) => member.userId === userId);
          if (!isMember) {
            return prev;
          }

          // Ensure members array exists
          const channelWithMembers = {
            ...event.channel,
            members: event.channel.members || []
          };

          const exists = prev.some(ch => ch.id === channelWithMembers.id);
          if (!exists) {
            return [...prev, channelWithMembers];
          }
          return prev.map(ch => ch.id === channelWithMembers.id ? channelWithMembers : ch);
        });
        return;
      }

      // Handle channel deletion
      if (event.type === 'deleted') {
        setChannels(prev => prev.filter(ch => ch.id !== event.channelId));
        return;
      }
    };

    // Subscribe to all channel-related events
    const events = [
      'channel:created',
      'channel:updated',
      'channel:deleted',
      'channel:member_joined',
      'channel:member_left'
    ];

    events.forEach(event => socket.on(event, handleChannelEvent));

    return () => {
      events.forEach(event => socket.off(event, handleChannelEvent));
    };
  }, [socket, toast, userId]);

  // Initial channel fetch
  useEffect(() => {
    refreshChannels();
  }, [refreshChannels]);

  return (
    <ChannelContext.Provider value={{ 
      channels, 
      isLoading, 
      error, 
      refreshChannels,
      joinChannel,
      leaveChannel
    }}>
      {children}
    </ChannelContext.Provider>
  );
};

export const useChannelContext = () => {
  const context = useContext(ChannelContext);
  if (!context) {
    throw new Error('useChannelContext must be used within a ChannelProvider');
  }
  return context;
}; 