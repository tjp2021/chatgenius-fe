import { api } from '../axios';
import { Thread, ThreadReply } from '@/types/thread';

export const threadApi = {
  // Create a new thread
  createThread: async (messageId: string): Promise<Thread> => {
    try {
      const response = await api.post<Thread>(`/messages/${messageId}/threads`);
      return response.data;
    } catch (error) {
      console.error('Error creating thread:', error);
      throw error;
    }
  },

  // Get a thread by ID
  getThread: async (threadId: string): Promise<Thread> => {
    try {
      const response = await api.get<Thread>(`/threads/${threadId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting thread:', error);
      throw error;
    }
  },

  // Add a reply to a thread
  addReply: async (threadId: string, content: string): Promise<ThreadReply> => {
    try {
      const response = await api.post<ThreadReply>(`/threads/${threadId}/replies`, { content });
      return response.data;
    } catch (error) {
      console.error('Error adding reply:', error);
      throw error;
    }
  },

  // Get replies for a thread
  getReplies: async (threadId: string): Promise<ThreadReply[]> => {
    try {
      const response = await api.get<ThreadReply[]>(`/threads/${threadId}/replies`);
      return response.data;
    } catch (error) {
      console.error('Error getting replies:', error);
      throw error;
    }
  }
}; 