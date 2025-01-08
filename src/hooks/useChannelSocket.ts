import { useEffect } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { useQueryClient } from '@tanstack/react-query';
import { Channel } from '@/types/channel';

interface ChannelUpdate {
  channel: Channel;
  timestamp: string;
}

interface MemberEvent {
  channelId: string;
  userId: string;
  userName: string;
  timestamp: string;
}

interface ChannelDeleteEvent {
  channelId: string;
  channelName: string;
  timestamp: string;
}

interface MembershipResponse {
    channelId: string;
    userId: string;
    role: string;
    createdAt: string;
    lastReadAt: string;
    joinedAt: string;
    unreadCount: number;
    channel: {
      id: string;
      name: string;
      description: string;
      type: string;
      createdById: string;
      createdAt: string;
      lastActivityAt: string;
      memberCount: number;
    };
    user: {
      id: string;
      email: string;
      name: string;
      imageUrl: string;
      createdAt: string;
      updatedAt: string;
      isOnline: boolean;
    };
  }

/**
 * Centralized socket event manager for channel-related events.
 * This hook handles all socket events related to channels and keeps
 * the React Query cache in sync with the socket events.
 */
export function useChannelSocket() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    // Handle socket connection events
    const handleConnect = () => {
      // Only invalidate on initial connection
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    };

    // Handle real-time channel updates
    const handleChannelUpdate = (data: ChannelUpdate) => {
      queryClient.setQueryData(['channels', 'browse', 'public'], (old: any) => {
        if (!old?.channels) return old;
        return {
          ...old,
          channels: old.channels.map((ch: Channel) => 
            ch.id === data.channel.id ? data.channel : ch
          )
        };
      });
    };

    // Handle member join events
    const handleMemberJoined = (data: MembershipResponse) => {
      console.log('Member joined event received:', data);

      // Update public channels list
      queryClient.setQueryData(['channels', 'browse', 'public'], (old: any) => {
        if (!old?.channels) return old;
        return {
          ...old,
          channels: old.channels.map((ch: Channel) => {
            if (ch.id === data.channelId) {
              return {
                ...ch,
                _count: {
                  ...ch._count,
                  members: data.channel.memberCount
                }
              };
            }
            return ch;
          })
        };
      });

      // If this is for the current user, refresh joined channels
      if (data.userId === socket.auth?.userId) {
        console.log('Current user joined channel, refreshing joined channels list');
        queryClient.invalidateQueries({ queryKey: ['channels', 'browse', 'joined'] });
      }
    };

    // Handle member leave events
    const handleMemberLeft = (data: MembershipResponse) => {
      // Update public channels list
      queryClient.setQueryData(['channels', 'browse', 'public'], (old: any) => {
        if (!old?.channels) return old;
        return {
          ...old,
          channels: old.channels.map((ch: Channel) => {
            if (ch.id === data.channelId) {
              return {
                ...ch,
                _count: {
                  ...ch._count,
                  members: data.channel.memberCount
                }
              };
            }
            return ch;
          })
        };
      });

      // If this is for the current user, refresh joined channels
      if (data.userId === socket.auth?.userId) {
        console.log('Current user left channel, refreshing joined channels list');
        queryClient.invalidateQueries({ queryKey: ['channels', 'browse', 'joined'] });
      }
    };

    // Subscribe to events
    socket.on('connect', handleConnect);
    socket.on('channel:updated', handleChannelUpdate);
    socket.on('channel:member_joined', handleMemberJoined);
    socket.on('channel:member_left', handleMemberLeft);

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('channel:updated', handleChannelUpdate);
      socket.off('channel:member_joined', handleMemberJoined);
      socket.off('channel:member_left', handleMemberLeft);
    };
  }, [socket, queryClient]);
} 