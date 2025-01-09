import { useEffect, useState } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Message } from '@/types/message';

export const useMessages = (channelId: string) => {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!socket) return;

    // Join channel
    socket.emit('channel:join', { channelId });

    // Listen for messages
    socket.on('message:new', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    // Fetch initial messages
    socket.emit('messages:get', { channelId }, (response: { messages: Message[] }) => {
      setMessages(response.messages);
      setIsLoading(false);
    });

    return () => {
      socket.emit('channel:leave', { channelId });
      socket.off('message:new');
    };
  }, [socket, channelId]);

  const sendMessage = (content: string) => {
    if (!socket) return;
    socket.emit('message:send', { channelId, content });
  };

  return {
    messages,
    isLoading,
    sendMessage
  };
}; 