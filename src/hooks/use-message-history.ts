import { useState, useCallback } from 'react';
import { Message } from '@/types/message';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/axios';

interface UseMessageHistoryReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  nextCursor: string | null;
  fetchMessages: (channelId: string, cursor?: string) => Promise<void>;
}

export function useMessageHistory(): UseMessageHistoryReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMessages = useCallback(async (channelId: string, cursor?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('limit', '50');
      if (cursor) {
        queryParams.append('cursor', cursor);
      }

      const response = await api.get(`/messages/channel/${channelId}?${queryParams}`);
      const data = response.data;
      
      if (!Array.isArray(data.messages)) {
        console.error('[Message History] Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }
      
      setMessages(prev => {
        if (cursor) {
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = data.messages.filter((m: Message) => !existingIds.has(m.id));
          return [...newMessages, ...prev];
        }
        return data.messages.sort((a: Message, b: Message) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
      
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error('[Message History] Failed to fetch messages:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    messages,
    isLoading,
    error,
    nextCursor,
    fetchMessages
  };
} 