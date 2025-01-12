import axios from 'axios';
import { Reaction } from '@/types/reaction';

export const reactionApi = {
  add: async (messageId: string, emoji: string): Promise<Reaction> => {
    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/messages/${messageId}/reactions`, {
      emoji,
    });
    return response.data;
  },

  remove: async (messageId: string, emoji: string): Promise<void> => {
    await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/messages/${messageId}/reactions`, {
      data: { emoji },
    });
  },

  getAll: async (messageId: string): Promise<Reaction[]> => {
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/messages/${messageId}/reactions`);
    return response.data;
  },
}; 