import { useEffect } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { useQueryClient } from '@tanstack/react-query';
import { Channel } from '@/types/channel';

interface ChannelUpdate {
  channel: Channel;
  timestamp: string;
}

interface MembershipResponse {
  channelId: string;
  userId: string;
  role: string;
  joinedAt: string;
  channel: {
    id: string;
    name: string;
    description: string;
    type: string;
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
    if (!socket) {
      console.log('⚠️ [SOCKET] No socket instance available');
      return;
    }

    console.log('🔌 [SOCKET] Initial socket state:', {
      connected: socket.connected,
      auth: socket.auth,
      id: socket.id
    });

    // Handle socket connection events
    const handleConnect = () => {
      console.log('🔌 [SOCKET] Connected! Socket ID:', socket.id);
      console.log('🔌 [SOCKET] Auth state:', socket.auth);
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
      console.log('🎯 [SOCKET JOIN] Event received:', data);
      console.log('🔍 [SOCKET JOIN] Current socket auth:', socket.auth);

      // Update public channels list
      queryClient.setQueryData(['channels', 'browse', 'public'], (old: any) => {
        console.log('📊 [SOCKET JOIN] Current public channels:', old?.channels);
        if (!old?.channels) return old;
        return {
          ...old,
          channels: old.channels.map((ch: Channel) => {
            if (ch.id === data.channelId) {
              console.log('✏️ [SOCKET JOIN] Updating channel in public list:', ch.id);
              return {
                ...ch,
                members: [...(ch.members || []), {
                  userId: data.userId,
                  role: data.role,
                  joinedAt: data.joinedAt
                }]
              };
            }
            return ch;
          })
        };
      });

      // If this is for the current user, update joined channels
      if (data.userId === socket.auth?.userId) {
        console.log('🎯 [SOCKET JOIN] Updating joined channels for current user');
        // Add to joined channels immediately with complete channel data
        queryClient.setQueryData(['channels', 'browse', 'joined'], (old: any) => {
          console.log('📊 [SOCKET JOIN] Current joined channels:', old?.channels);
          if (!old?.channels) {
            console.log('⚠️ [SOCKET JOIN] No existing channels, creating new list');
            return { channels: [data.channel] };
          }
          
          // Don't add if already exists
          if (old.channels.some((ch: Channel) => ch.id === data.channelId)) {
            console.log('⚠️ [SOCKET JOIN] Channel already in joined list:', data.channelId);
            return old;
          }
          
          // Create complete channel object from the membership response
          const newChannel = {
            ...data.channel,
            members: [{
              userId: data.userId,
              role: data.role,
              joinedAt: data.joinedAt
            }]
          };
          
          console.log('✨ [SOCKET JOIN] Adding new channel to joined list:', newChannel);
          return {
            ...old,
            channels: [...old.channels, newChannel]
          };
        });
      } else {
        console.log('ℹ️ [SOCKET JOIN] Event was for different user:', data.userId);
      }
    };

    // Handle member leave events
    const handleMemberLeft = (data: MembershipResponse) => {
      console.log('🎯 [SOCKET LEAVE] Event received:', data);
      console.log('🔍 [SOCKET LEAVE] Current socket auth:', socket.auth);

      // Update public channels list
      queryClient.setQueryData(['channels', 'browse', 'public'], (old: any) => {
        console.log('📊 [SOCKET LEAVE] Current public channels:', old?.channels);
        if (!old?.channels) return old;
        return {
          ...old,
          channels: old.channels.map((ch: Channel) => {
            if (ch.id === data.channelId) {
              console.log('✏️ [SOCKET LEAVE] Updating channel in public list:', ch.id);
              return {
                ...ch,
                members: (ch.members || []).filter(m => m.userId !== data.userId)
              };
            }
            return ch;
          })
        };
      });

      // If this is for the current user, update joined channels
      if (data.userId === socket.auth?.userId) {
        console.log('🎯 [SOCKET LEAVE] Removing channel from joined list for current user');
        queryClient.setQueryData(['channels', 'browse', 'joined'], (old: any) => {
          console.log('📊 [SOCKET LEAVE] Current joined channels:', old?.channels);
          if (!old?.channels) return old;
          
          console.log('✨ [SOCKET LEAVE] Filtering out channel:', data.channelId);
          return {
            ...old,
            channels: old.channels.filter((ch: Channel) => ch.id !== data.channelId)
          };
        });
      } else {
        console.log('ℹ️ [SOCKET LEAVE] Event was for different user:', data.userId);
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