import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

interface User {
  id: string;
  name: string;
  imageUrl?: string;
}

export function useUsers() {
  const { data: users = {} } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get<User[]>('/users');
      // Convert array to Record<string, string> for name lookup
      return response.data.reduce((acc, user) => ({
        ...acc,
        [user.id]: user.name
      }), {} as Record<string, string>);
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return { users };
} 