import { useEffect, useCallback } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { useThreadStore } from '@/hooks/use-thread-store';
import { useToast } from '@/components/ui/use-toast';
import { SOCKET_EVENTS } from '@/constants/socket-events';

export function useThreadSocket(threadId: string, channelId: string) {
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const { addReply } = useThreadStore();

  // Debug socket state
  useEffect(() => {
    console.log('[ThreadSocket][Debug] Socket state:', {
      hasSocket: !!socket,
      isConnected,
      socketId: socket?.id,
      threadId,
      channelId,
      timestamp: new Date().toISOString()
    });
  }, [socket, isConnected, threadId, channelId]);

  useEffect(() => {
    if (!socket || !threadId || !channelId) {
      console.log('[ThreadSocket] Skipping setup - missing dependencies:', {
        hasSocket: !!socket,
        hasThreadId: !!threadId,
        hasChannelId: !!channelId
      });
      return;
    }

    if (!isConnected) {
      console.log('[ThreadSocket] Socket not connected yet');
      return;
    }

    console.log('[ThreadSocket] Initializing socket listeners for thread:', threadId, 'channel:', channelId);

    // Join thread room
    socket.joinThread(threadId, channelId).catch(error => {
      console.error('[ThreadSocket] Failed to join thread:', error);
    });

    const handleReplyCreated = (data: any) => {
      console.log('[ThreadSocket][REPLY_CREATED] Received event:', {
        threadId: data.threadId,
        messageId: data.message?.id,
        tempId: data.tempId,
        content: data.message?.content,
        timestamp: new Date().toISOString()
      });

      if (data.threadId === threadId && data.message) {
        console.log('[ThreadSocket][REPLY_CREATED] Adding reply to thread store');
        addReply(data.message);
      } else {
        console.log('[ThreadSocket][REPLY_CREATED] Skipping reply - thread mismatch or no message', {
          expectedThreadId: threadId,
          receivedThreadId: data.threadId,
          hasMessage: !!data.message
        });
      }
    };

    const handleReplyDelivered = (data: any) => {
      console.log('[ThreadSocket][REPLY_DELIVERED] Received event:', {
        threadId: data.threadId,
        messageId: data.messageId,
        tempId: data.tempId,
        status: data.status,
        processed: data.processed,
        timestamp: new Date().toISOString()
      });
    };

    // Listen for new replies
    socket.onThreadReplyCreated?.(handleReplyCreated);
    socket.onThreadReplyDelivered?.(handleReplyDelivered);

    // Cleanup
    return () => {
      console.log('[ThreadSocket] Cleaning up socket listeners for thread:', threadId);
      socket.leaveThread(threadId, channelId).catch(console.error);
      socket.offThreadReplyCreated?.(handleReplyCreated);
      socket.offThreadReplyDelivered?.(handleReplyDelivered);
    };
  }, [socket, threadId, channelId, addReply]);

  const sendReply = useCallback(async (content: string) => {
    if (!socket || !threadId || !channelId) {
      console.error('[ThreadSocket][sendReply] Cannot send reply - socket not connected');
      throw new Error('Cannot send reply - socket not connected');
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('[ThreadSocket][sendReply] Sending reply:', {
      threadId,
      channelId,
      tempId,
      content,
      timestamp: new Date().toISOString()
    });

    try {
      const response = await socket.sendThreadReply(content, threadId, channelId, tempId);
      console.log('[ThreadSocket][sendReply] Response received:', {
        success: response.success,
        error: response.error,
        timestamp: new Date().toISOString()
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to send reply');
      }
    } catch (error) {
      console.error('[ThreadSocket][sendReply] Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to send reply',
        variant: 'destructive'
      });
      throw error;
    }
  }, [socket, threadId, channelId, toast]);

  return {
    sendReply
  };
} 