import { useQuery, useMutation } from '@tanstack/react-query';
import { axios } from '@/lib/axios';
import { Channel } from '@prisma/client';

export const useChannels = () => {
  return useQuery({
    queryKey: ['channels'],
    queryFn: () => axios.get('/channels').then(res => res.data),
  });
};

export const useCreateChannel = () => {
  return useMutation({
    mutationFn: (data: { name: string; type: 'PUBLIC' | 'PRIVATE' | 'DM' }) =>
      axios.post('/channels', data).then(res => res.data),
  });
}; 