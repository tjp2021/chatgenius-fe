import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Message } from '@/types/message';
import { useToast } from '@/components/ui/use-toast';

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
  const { getToken } = useAuth();
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

      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('[Message History] Fetching with token:', token.slice(0, 10) + '...');

      const url = `${process.env.NEXT_PUBLIC_API_URL}/messages/channel/${channelId}?${queryParams}`;
      console.log('[Message History] Fetching from URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        // Try to get detailed error from response
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // If we can't parse the error JSON, use the status text
          console.error('[Message History] Failed to parse error response:', e);
        }
        throw new Error(`Server error: ${errorMessage} (${response.status})`);
      }

      const data = await response.json();
      console.log('[Message History] Received data:', data);
      
      if (!Array.isArray(data.messages)) {
        console.error('[Message History] Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }
      
      setMessages(prev => {
        // If we're loading more (have cursor), append to existing messages
        if (cursor) {
          return [...prev, ...data.messages];
        }
        // Otherwise replace existing messages
        return data.messages;
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
  }, [getToken, toast]);

  return {
    messages,
    isLoading,
    error,
    nextCursor,
    fetchMessages
  };
} 