import { MessagePayload } from '@/types/message';

const OFFLINE_MESSAGES_KEY = 'offline_messages';

interface StoredMessage {
  payload: MessagePayload;
  timestamp: number;
  channelId: string;
}

export const messageStorage = {
  saveMessage: (channelId: string, payload: MessagePayload) => {
    try {
      const stored = localStorage.getItem(OFFLINE_MESSAGES_KEY);
      const messages: StoredMessage[] = stored ? JSON.parse(stored) : [];
      
      messages.push({
        payload,
        timestamp: Date.now(),
        channelId
      });
      
      localStorage.setItem(OFFLINE_MESSAGES_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Failed to save offline message:', error);
    }
  },

  getMessages: (channelId: string): StoredMessage[] => {
    try {
      const stored = localStorage.getItem(OFFLINE_MESSAGES_KEY);
      if (!stored) return [];

      const messages: StoredMessage[] = JSON.parse(stored);
      return messages.filter(msg => msg.channelId === channelId);
    } catch (error) {
      console.error('Failed to get offline messages:', error);
      return [];
    }
  },

  removeMessage: (channelId: string, timestamp: number) => {
    try {
      const stored = localStorage.getItem(OFFLINE_MESSAGES_KEY);
      if (!stored) return;

      const messages: StoredMessage[] = JSON.parse(stored);
      const filtered = messages.filter(
        msg => !(msg.channelId === channelId && msg.timestamp === timestamp)
      );
      
      localStorage.setItem(OFFLINE_MESSAGES_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove offline message:', error);
    }
  },

  clearMessages: (channelId: string) => {
    try {
      const stored = localStorage.getItem(OFFLINE_MESSAGES_KEY);
      if (!stored) return;

      const messages: StoredMessage[] = JSON.parse(stored);
      const filtered = messages.filter(msg => msg.channelId !== channelId);
      
      localStorage.setItem(OFFLINE_MESSAGES_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to clear offline messages:', error);
    }
  }
}; 