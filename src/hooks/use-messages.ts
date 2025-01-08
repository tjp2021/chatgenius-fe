import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { Message } from '@prisma/client';
import { useSocket } from '@/providers/socket-provider';
import { useEffect } from 'react';

export function useMessages(channelId: string) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !channelId) return;

    // Subscribe to channel updates
    socket.emit('channel:subscribe', { channelId });

    return () => {
      // Unsubscribe when leaving
      socket.emit('channel:unsubscribe', { channelId });
    };
  }, [socket, channelId]);

  return useQuery({
    queryKey: ['messages', channelId],
    queryFn: () => 
      api.get<Message[]>(`/messages/channel/${channelId}`).then(res => res.data),
  });
} 