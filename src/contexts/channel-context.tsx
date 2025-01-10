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
  const { socket, isConnected, isConnecting } = useSocket();
  const { toast } = useToast();

  const refreshChannels = useCallback(async () => {
    try {
      console.log('Refreshing channels...');
      setIsLoading(true);
      const token = await getToken();
      if (!token) {
        console.log('No token available');
        throw new Error('No authentication token available');
      }

      // If socket is connected, try socket first
      if (socket && isConnected && !isConnecting) {
        try {
          const socketPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Socket timeout'));
            }, 5000);

            socket.emit('channels:list', { include: 'members.user' }, (response: any) => {
              clearTimeout(timeout);
              if (response.error) {
                reject(new Error(response.error));
              } else {
                resolve(response);
              }
            });
          });

          const response: any = await socketPromise;
          const userChannels = response.data.filter((channel: Channel) => 
            channel.members?.some(member => member.userId === userId)
          );
          setChannels(userChannels);
          console.log('Channels updated via socket:', userChannels);
          return;
        } catch (socketError) {
          console.warn('Socket fetch failed, falling back to REST:', socketError);
        }
      }
        
      // Fallback to REST API
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
      const userChannels = data.filter((channel: Channel) => 
        channel.members?.some(member => member.userId === userId)
      );
      
      setChannels(userChannels);
      console.log('Channels updated via REST:', userChannels);
    } catch (err) {
      console.error('Error refreshing channels:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch channels'));
    } finally {
      setIsLoading(false);
    }
  }, [getToken, userId, socket, isConnected, isConnecting]);

  // Refresh channels when socket connects
  useEffect(() => {
    if (isConnected && !isConnecting) {
      refreshChannels();
    }
  }, [isConnected, isConnecting, refreshChannels]);

  // Listen for channel updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleChannelUpdate = (data: any) => {
      refreshChannels();
    };

    socket.on('channel:updated', handleChannelUpdate);
    socket.on('channel:deleted', handleChannelUpdate);
    socket.on('channel:created', handleChannelUpdate);

    return () => {
      socket.off('channel:updated', handleChannelUpdate);
      socket.off('channel:deleted', handleChannelUpdate);
      socket.off('channel:created', handleChannelUpdate);
    };
  }, [socket, isConnected, refreshChannels]);

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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/channels/${channelId}/leave`, {
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
    console.log('Starting initial channel fetch');
    if (!userId) {
      console.log('No userId yet, skipping fetch');
      return;
    }
    refreshChannels();
  }, [refreshChannels, userId]);

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