import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axios } from '@/lib/axios';
import { Message } from '@prisma/client';
import { useSocket } from '@/providers/socket-provider';
import { useEffect } from 'react';

export const useChannelMessages = (channelId: string) => {
  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

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
  }, [socket, channelId, queryClient]);

  return useQuery({
    queryKey: ['messages', channelId],
    queryFn: () => 
      axios.get(`/messages/channel/${channelId}`).then(res => res.data),
  });
}; 