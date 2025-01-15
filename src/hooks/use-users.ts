import { useAuth } from '@clerk/nextjs';
import { api } from '@/lib/axios';
import { User } from '@/types/user';

export const useUsers = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const fetchUsers = async () => {
    if (!isLoaded || !isSignedIn) {
      console.log('[Users] Not ready:', { isLoaded, isSignedIn });
      return [];
    }

    const token = await getToken();
    if (!token) {
      console.log('[Users] No token yet');
      return [];
    }

    try {
      const response = await api.get<User[]>('/users');
      return response.data;
    } catch (error) {
      console.error('[Users] Error fetching users:', error);
      return [];
    }
  };

  return { fetchUsers };
}; 