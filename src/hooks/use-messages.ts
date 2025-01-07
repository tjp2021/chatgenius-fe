import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { Message } from '@prisma/client';
import { useSocket } from '@/providers/socket-provider';
import { useEffect } from 'react';

export const useChannelMessages = (channelId: string) => {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('channel:join', channelId);

    const handleNewMessage = (message: Message) => {
      queryClient.setQueryData(['messages', channelId], (old: Message[] = []) => {
        return [...old, message];
      });
    };

    socket.on('message:new', handleNewMessage);

    return () => {
      socket.emit('channel:leave', channelId);
      socket.off('message:new', handleNewMessage);
    };
  }, [socket, isConnected, channelId, queryClient]);

  return useQuery({
    queryKey: ['messages', channelId],
    queryFn: () => 
      api.get<Message[]>(`/messages/channel/${channelId}`).then(res => res.data),
  });
}; 