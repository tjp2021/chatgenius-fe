'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from './use-local-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { Channel, ChannelType, ChannelWithDetails } from '@/types/channel';
import { useSocket } from '@/providers/socket-provider';
import { api } from '@/lib/axios';

interface ChannelNavigationState {
  currentChannel: string | null;
  previousChannel: string | null;
  navigationStack: string[];
  pushChannel: (channelId: string) => Promise<void>;
  goBack: () => void;
  canGoBack: boolean;
  isLoading: boolean;
  error: Error | null;
}

const NAVIGATION_STORAGE_KEY = 'channel_navigation';
const MAX_HISTORY_SIZE = 10;
const MAX_RETRY_ATTEMPTS = 3;

interface StoredNavigation {
  stack: string[];
  currentIndex: number;
  lastViewedTimestamp?: number;
}

interface ChannelTransitionState {
  retryCount: number;
  isTransitioning: boolean;
}

interface JoinedChannelsResponse {
  channels: ChannelWithDetails[];
}

export function useChannelNavigation(): ChannelNavigationState {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const [transitionState, setTransitionState] = useState<ChannelTransitionState>({
    retryCount: 0,
    isTransitioning: false
  });

  const [{ stack, currentIndex, lastViewedTimestamp }, setNavigation] = useLocalStorage<StoredNavigation>(NAVIGATION_STORAGE_KEY, {
    stack: [],
    currentIndex: -1
  });

  // Fetch joined channels for transition logic
  const { data: joinedChannels, isLoading, error } = useQuery<JoinedChannelsResponse>({
    queryKey: ['channels', 'joined'],
    queryFn: async () => {
      const response = await api.get<JoinedChannelsResponse>('/channels/browse/joined');
      return response.data;
    },
    staleTime: 30000, // 30 seconds as per PRD
    retry: 3,
    retryDelay: 1000,
  });

  const currentChannel = stack[currentIndex] || null;
  const previousChannel = currentIndex > 0 ? stack[currentIndex - 1] : null;
  const canGoBack = currentIndex > 0;

  // Handle WebSocket events
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Channel membership changes
    socket.on('channel:update', (channelId: string) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    });

    // Permission updates
    socket.on('channel:permissions', async (channelId: string) => {
      if (currentChannel === channelId) {
        try {
          await api.get(`/channels/${channelId}/members`);
        } catch (error) {
          handleChannelTransition();
        }
      }
    });

    return () => {
      socket.off('channel:update');
      socket.off('channel:permissions');
    };
  }, [socket, isConnected, currentChannel, queryClient]);

  // Find next channel based on priority
  const findNextChannel = useCallback(() => {
    if (!joinedChannels?.channels) return null;

    // Follow priority: Public > Private > DM
    const firstPublicChannel = joinedChannels.channels.find((c: ChannelWithDetails) => c.type === ChannelType.PUBLIC);
    if (firstPublicChannel) return firstPublicChannel.id;

    const firstPrivateChannel = joinedChannels.channels.find((c: ChannelWithDetails) => c.type === ChannelType.PRIVATE);
    if (firstPrivateChannel) return firstPrivateChannel.id;

    const firstDmChannel = joinedChannels.channels.find((c: ChannelWithDetails) => c.type === ChannelType.DM);
    if (firstDmChannel) return firstDmChannel.id;

    return null;
  }, [joinedChannels]);

  // Handle channel transitions
  const handleChannelTransition = useCallback(async () => {
    const nextChannelId = findNextChannel();
    
    if (!nextChannelId) {
      // No channels left, show welcome view
      router.push('/channels');
      return;
    }

    try {
      // Begin transition
      setTransitionState(prev => ({
        ...prev,
        isTransitioning: true
      }));

      // Update navigation stack
      await pushChannel(nextChannelId);

    } catch (error) {
      if (transitionState.retryCount < MAX_RETRY_ATTEMPTS) {
        setTransitionState(prev => ({
          retryCount: prev.retryCount + 1,
          isTransitioning: false
        }));
        // Retry transition
        handleChannelTransition();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to switch channels. Please try again."
        });
        console.error('[CHANNEL_TRANSITION_ERROR]', error);
      }
    } finally {
      setTransitionState({
        retryCount: 0,
        isTransitioning: false
      });
    }
  }, [currentChannel, findNextChannel, router, transitionState.retryCount]);

  const pushChannel = useCallback(async (channelId: string) => {
    try {
      // Verify channel access
      await api.get(`/channels/${channelId}/members`);

      // Update navigation stack
      setNavigation(prev => {
        const newStack = [...prev.stack.slice(0, prev.currentIndex + 1), channelId];
        
        // Limit stack size
        if (newStack.length > MAX_HISTORY_SIZE) {
          newStack.shift();
        }

        return {
          stack: newStack,
          currentIndex: newStack.length - 1,
          lastViewedTimestamp: Date.now()
        };
      });

      // Update URL
      router.push(`/channels/${channelId}`);

      // Join channel's socket room
      if (socket && isConnected) {
        socket.emit('channel:join', { channelId });
      }

    } catch (error) {
      console.error('[PUSH_CHANNEL_ERROR]', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to access channel"
      });
      throw error;
    }
  }, [router, setNavigation, socket, isConnected]);

  const goBack = useCallback(() => {
    if (!canGoBack) return;

    const prevChannel = stack[currentIndex - 1];
    if (prevChannel) {
      // Leave current channel's socket room
      if (currentChannel && socket && isConnected) {
        socket.emit('channel:leave', { channelId: currentChannel });
      }

      setNavigation(prev => ({
        ...prev,
        currentIndex: prev.currentIndex - 1,
        lastViewedTimestamp: Date.now()
      }));

      router.push(`/channels/${prevChannel}`);
    }
  }, [canGoBack, currentChannel, currentIndex, router, setNavigation, socket, isConnected, stack]);

  const navigateToChannel = useCallback((channelId: string) => {
    if (!socket) return;

    // Only subscribe to real-time updates
    socket.emit('channel:subscribe', { channelId });
    router.push(`/channels/${channelId}`);
  }, [socket, router]);

  return {
    currentChannel,
    previousChannel,
    navigationStack: stack,
    pushChannel,
    goBack,
    canGoBack,
    isLoading,
    error: error as Error | null
  };
} 