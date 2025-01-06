import { useQuery, useMutation } from '@tanstack/react-query';
import { axios } from '@/lib/axios';
import { Message } from '@prisma/client';
import { useSocket } from '@/providers/socket-provider';

export const useChannelMessages = (channelId: string) => {
  const socket = useSocket();

  return useQuery({
    queryKey: ['messages', channelId],
    queryFn: () => 
      axios.get(`/messages/channel/${channelId}`).then(res => res.data),
    onSuccess: () => {
      socket?.emit('channel:join', channelId);
    },
    onError: () => {
      socket?.emit('channel:leave', channelId);
    },
  });
}; 