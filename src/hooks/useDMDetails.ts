import { useQuery } from '@tanstack/react-query';
import { useApi } from './useApi';

interface DMDetails {
  otherUser: {
    id: string;
    name: string | null;
    email: string;
    imageUrl?: string;
  };
}

export function useDMDetails(channelId: string) {
  const api = useApi();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dm-details', channelId],
    queryFn: async () => {
      const response = await api.get<DMDetails>(`/channels/${channelId}/dm-details`);
      return response.data;
    },
    enabled: !!channelId,
  });

  return {
    otherUser: data?.otherUser,
    isLoading,
    error
  };
} 