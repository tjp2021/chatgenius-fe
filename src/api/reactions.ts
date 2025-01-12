import axios from 'axios';
import { Reaction } from '@/types/reaction';

export const reactionApi = {
  add: async (messageId: string, emoji: string, token: string): Promise<Reaction> => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/messages/${messageId}/reactions`;
    const data = { type: emoji };
    
    console.log('Adding reaction:', {
      url,
      data,
      messageId,
      emoji,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer [token]' // Don't log actual token
      }
    });
    
    const response = await axios({
      method: 'POST',
      url,
      data,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return {
      ...response.data,
      emoji: emoji
    };
  },

  remove: async (messageId: string, emoji: string, token: string): Promise<void> => {
    await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/messages/${messageId}/reactions`, {
      data: { type: emoji },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  },

  getAll: async (messageId: string, token: string): Promise<Reaction[]> => {
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/messages/${messageId}/reactions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.map((reaction: any) => ({
      ...reaction,
      emoji: reaction.type
    }));
  },
}; 