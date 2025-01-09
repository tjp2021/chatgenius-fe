import { useEffect, useState } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Message, MessageEvent, MessageDeliveryStatus, MessagePayload, MessageResponse } from '@/types/message';
import { useToast } from '@/components/ui/use-toast';

interface OptimisticMessage extends Message {
  isPending: boolean;
  isFailed: boolean;
  tempId?: string;
}

export const useMessages = (channelId: string) => {
  const { socket } = useSocket();
  const { toast } = useToast();
  const [messages, setMessages] = useState<OptimisticMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!socket) return;

    // Join channel
    socket.emit('channel:join', { channelId });

    // Listen for new messages
    const handleNewMessage = (message: Message) => {
      setMessages(prev => {
        // Remove optimistic message if it exists
        const filtered = prev.filter(m => m.tempId !== message.id);
        return [...filtered, { ...message, isPending: false, isFailed: false }];
      });

      // Send delivery acknowledgment
      socket.emit(MessageEvent.DELIVERED, {
        messageId: message.id,
        channelId: message.channelId,
        status: MessageDeliveryStatus.DELIVERED
      });
    };

    // Handle message sent confirmation
    const handleMessageSent = (response: MessageResponse) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.tempId === response.messageId 
            ? { ...msg, id: response.messageId, isPending: false, isFailed: false }
            : msg
        )
      );
    };

    // Handle message errors
    const handleMessageError = ({ messageId, error }: { messageId: string; error: string }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg.tempId === messageId
            ? { ...msg, isPending: false, isFailed: true }
            : msg
        )
      );

      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: error
      });
    };

    // Fetch initial messages
    socket.emit('messages:get', { channelId }, (response: { messages: Message[] }) => {
      setMessages(response.messages.map(msg => ({ 
        ...msg, 
        isPending: false, 
        isFailed: false 
      })));
      setIsLoading(false);
    });

    // Subscribe to events
    socket.on(MessageEvent.NEW, handleNewMessage);
    socket.on(MessageEvent.SENT, handleMessageSent);
    socket.on(MessageEvent.ERROR, handleMessageError);

    return () => {
      socket.off(MessageEvent.NEW, handleNewMessage);
      socket.off(MessageEvent.SENT, handleMessageSent);
      socket.off(MessageEvent.ERROR, handleMessageError);
    };
  }, [socket, channelId, toast]);

  const sendMessage = (content: string) => {
    if (!socket) return;

    // Create temporary ID for optimistic update
    const tempId = `temp-${Date.now()}`;
    
    // Create optimistic message
    const optimisticMessage: OptimisticMessage = {
      id: tempId,
      tempId,
      content,
      channelId,
      userId: (socket as any).auth?.userId || 'unknown',
      userName: (socket as any).auth?.userName || 'You',
      createdAt: new Date().toISOString(),
      isPending: true,
      isFailed: false
    };

    // Add optimistic message
    setMessages(prev => [...prev, optimisticMessage]);

    // Send the actual message
    socket.emit(MessageEvent.SEND, {
      content,
      channelId,
      tempId
    } as MessagePayload);
  };

  const retryMessage = (tempId: string) => {
    const failedMessage = messages.find(m => m.tempId === tempId);
    if (!failedMessage || !socket) return;

    // Update message status
    setMessages(prev =>
      prev.map(msg =>
        msg.tempId === tempId
          ? { ...msg, isPending: true, isFailed: false }
          : msg
      )
    );

    // Retry sending
    socket.emit(MessageEvent.SEND, {
      content: failedMessage.content,
      channelId,
      tempId
    } as MessagePayload);
  };

  return {
    messages,
    isLoading,
    sendMessage,
    retryMessage
  };
}; 