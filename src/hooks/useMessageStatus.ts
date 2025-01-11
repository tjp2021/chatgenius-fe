import { useEffect, useCallback } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { useQueryClient } from '@tanstack/react-query';
import { MessageEvent, MessageDeliveryStatus, MessageReadReceipt } from '@/types/message';
import { messageKeys } from '@/lib/query-keys';

interface MessageData {
  id: string;
  channelId: string;
  deliveryStatus: MessageDeliveryStatus;
  readBy: MessageReadReceipt[];
}

interface MessageListData {
  messages: MessageData[];
}

export function useMessageStatus(channelId: string) {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    if (!socket || !isConnected) return;

    socket.emit(MessageEvent.READ, {
      messageId,
      channelId
    });
  }, [socket, isConnected, channelId]);

  // Handle message status events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleDeliveryUpdate = (data: {
      messageId: string;
      channelId: string;
      userId: string;
      status: MessageDeliveryStatus;
    }) => {
      if (data.channelId !== channelId) return;

      // Update message delivery status in cache
      queryClient.setQueriesData<MessageListData>(
        { queryKey: messageKeys.list(channelId) },
        (old) => {
          if (!old) return old;
          return {
            messages: old.messages.map(msg => {
              if (msg.id === data.messageId) {
                return {
                  ...msg,
                  deliveryStatus: data.status
                };
              }
              return msg;
            })
          };
        }
      );
    };

    const handleReadReceipt = (data: {
      messageId: string;
      channelId: string;
      readReceipt: MessageReadReceipt;
    }) => {
      if (data.channelId !== channelId) return;

      // Update message read receipts in cache
      queryClient.setQueriesData<MessageListData>(
        { queryKey: messageKeys.list(channelId) },
        (old) => {
          if (!old) return old;
          return {
            messages: old.messages.map(msg => {
              if (msg.id === data.messageId) {
                // Add read receipt if not already present
                const hasReceipt = msg.readBy.some(r => r.userId === data.readReceipt.userId);
                if (!hasReceipt) {
                  return {
                    ...msg,
                    readBy: [...msg.readBy, data.readReceipt],
                    deliveryStatus: MessageDeliveryStatus.READ
                  };
                }
              }
              return msg;
            })
          };
        }
      );
    };

    socket.on(MessageEvent.DELIVERED, handleDeliveryUpdate);
    socket.on(MessageEvent.READ, handleReadReceipt);

    return () => {
      socket.off(MessageEvent.DELIVERED, handleDeliveryUpdate);
      socket.off(MessageEvent.READ, handleReadReceipt);
    };
  }, [socket, isConnected, channelId, queryClient]);

  return {
    markAsRead
  };
} 