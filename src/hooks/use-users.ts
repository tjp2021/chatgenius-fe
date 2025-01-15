import { api } from '@/lib/axios';
import { User } from '@/types/user';

export const useUsers = () => {
  const fetchUsers = async () => {
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