'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSocket } from '@/providers/socket-provider';

interface NavigationState {
  currentChannelId: string | null;
  previousChannelId: string | null;
}

export function useChannelNavigation() {
  const router = useRouter();
  const params = useParams();
  const { socket, isConnected } = useSocket();
  const navigationState = useRef<NavigationState>({
    currentChannelId: null,
    previousChannelId: null
  });

  const pushChannel = useCallback((channelId: string) => {
    navigationState.current = {
      currentChannelId: channelId,
      previousChannelId: navigationState.current.currentChannelId
    };
    router.push(`/channels/${channelId}`);
  }, [router]);

  const handleChannelTransition = useCallback(async () => {
    const { currentChannelId, previousChannelId } = navigationState.current;

    if (!socket || !isConnected) return;

    if (previousChannelId) {
      socket.emit('channel:leave', { channelId: previousChannelId });
    }

    if (currentChannelId) {
      socket.emit('channel:join', { channelId: currentChannelId });
    }
  }, [socket, isConnected]);

  useEffect(() => {
    handleChannelTransition();
  }, [handleChannelTransition]);

  useEffect(() => {
    const channelId = params?.channelId as string;
    if (channelId && channelId !== navigationState.current.currentChannelId) {
      navigationState.current.currentChannelId = channelId;
      handleChannelTransition();
    }
  }, [params?.channelId, handleChannelTransition]);

  return {
    pushChannel,
    currentChannelId: navigationState.current.currentChannelId
  };
} 