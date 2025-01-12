'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Message, MessageDeliveryStatus, MessageUser } from '@/types/message';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@clerk/nextjs';
import { CheckIcon, CheckCheckIcon, Send, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useChannelContext } from '@/contexts/channel-context';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';
import { useMessageHistory } from '@/hooks/use-message-history';
import { MessageReactions } from './message-reactions';

interface ChatWindowProps {
  channelId: string;
  initialMessages?: Message[];
}

interface MessageStatus {
  id: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

interface SocketResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

interface MessageResponse extends SocketResponse {
  data: {
    message: Message;
    tempId?: string;
  };
}

interface MessageDeliveredPayload {
  messageId: string;
  tempId: string;
  status: MessageDeliveryStatus.DELIVERED;
  processed: true;
}

interface MessageCreatedPayload {
  message: Message;
  tempId: string;
  processed: true;
}

interface MessageFailedPayload {
  error: string;
  tempId: string;
  status: MessageDeliveryStatus.FAILED;
  processed: true;
}

export function ChatWindow({ channelId, initialMessages = [] }: ChatWindowProps) {
  console.log('ChatWindow mounting/updating', { channelId, initialMessages });
  
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const { userId } = useAuth();
  const { user } = useUser();
  const { channels } = useChannelContext();
  const [newMessage, setNewMessage] = useState('');
  const [messageStatuses, setMessageStatuses] = useState<MessageStatus[]>([]);
  const [localMessages, setLocalMessages] = useState<Message[]>(initialMessages);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Use the message history hook
  const {
    messages: historyMessages,
    isLoading,
    error,
    nextCursor,
    fetchMessages
  } = useMessageHistory();

  // Combine history messages with local messages
  const messages = useMemo(() => {
    // Create a Set of message IDs to track duplicates
    const messageIds = new Set<string>();
    const combinedMessages: Message[] = [];

    // Add history messages first
    historyMessages.forEach(msg => {
      if (!messageIds.has(msg.id)) {
        messageIds.add(msg.id);
        combinedMessages.push(msg);
      }
    });

    // Add local messages, avoiding duplicates
    localMessages.forEach(msg => {
      // For temporary messages (those being sent), always include them
      if (msg.id.startsWith('temp-') || !messageIds.has(msg.id)) {
        messageIds.add(msg.id);
        combinedMessages.push(msg);
      }
    });

    // Sort messages by creation time
    return combinedMessages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [historyMessages, localMessages]);

  // Get channel name
  const channel = channels.find(c => c.id === channelId);
  const channelName = channel?.name || channelId;

  const handleLeaveChannel = useCallback(async () => {
    if (!socket) return;
    try {
      socket.emit('channel:leave', { channelId });
      setLocalMessages([]);
      setMessageStatuses([]);
    } catch (error) {
      console.error('Failed to leave channel:', error);
    }
  }, [socket, channelId]);

  // Combine all socket-related effects into one
  useEffect(() => {
    console.log('CRITICAL - Socket/Channel status:', {
      hasSocket: !!socket,
      isConnected,
      channelId,
      socketId: socket?.getSocketId?.(),
      messageCount: messages.length,
      currentMessageStatuses: messageStatuses
    });
    
    if (!socket || !isConnected) {
      console.log('CRITICAL - Socket not ready');
      return;
    }

    // Register event handlers
    console.log('CRITICAL - Registering socket event handlers');
    
    const handleMessageDelivered = (payload: MessageDeliveredPayload) => {
      console.log('CRITICAL - message:delivered received:', {
        payload,
        currentStatuses: messageStatuses,
        willUpdate: payload.tempId
      });
      
      if (payload.processed && payload.status === MessageDeliveryStatus.DELIVERED) {
        setMessageStatuses(prev => {
          console.log('CRITICAL - Updating message status:', {
            prevStatuses: prev,
            tempId: payload.tempId,
            matchingStatus: prev.find(s => s.id === payload.tempId)
          });
          
          const updated = prev.map(status =>
            status.id === payload.tempId 
              ? { ...status, status: 'delivered' as const } 
              : status
          );
          console.log('CRITICAL - New message statuses:', updated);
          return updated;
        });
      }
    };

    const handleMessageCreated = (payload: MessageCreatedPayload) => {
      console.log('CRITICAL - message:created received:', {
        payload,
        currentStatuses: messageStatuses,
        currentMessages: localMessages
      });
      
      if (payload.processed && payload.message) {
        setLocalMessages(prev => {
          const filtered = prev.filter(msg => msg.id !== payload.tempId);
          const updated = [...filtered, payload.message];
          console.log('CRITICAL - Updated messages:', {
            filtered,
            updated,
            tempId: payload.tempId
          });
          return updated;
        });

        if (payload.tempId) {
          setMessageStatuses(prev => {
            const updated = prev.map(status =>
              status.id === payload.tempId 
                ? { ...status, status: 'sent' as const }
                : status
            );
            console.log('CRITICAL - Updated statuses:', updated);
            return updated;
          });
        }
      }
    };

    const handleMessageFailed = (payload: MessageFailedPayload) => {
      console.log('CRITICAL - message:failed received:', payload);
      
      if (payload.processed && payload.status === MessageDeliveryStatus.FAILED) {
        toast({
          title: 'Error',
          description: payload.error || 'Failed to send message',
          variant: 'destructive'
        });
        
        setLocalMessages(prev => prev.filter(msg => msg.id !== payload.tempId));
        setMessageStatuses(prev => prev.filter(status => status.id !== payload.tempId));
      }
    };

    socket.on('message:delivered', handleMessageDelivered);
    socket.on('message:created', handleMessageCreated);
    socket.on('message:failed', handleMessageFailed);

    return () => {
      console.log('CRITICAL - Cleaning up socket listeners');
      socket.off('message:delivered', handleMessageDelivered);
      socket.off('message:created', handleMessageCreated);
      socket.off('message:failed', handleMessageFailed);
    };
  }, [socket, isConnected, channelId, messageStatuses, localMessages]);

  const handleSendMessage = async () => {
    console.log('[Send] ====== STARTING MESSAGE SEND FLOW ======');
    console.log('[Send] Initial state:', {
      hasSocket: !!socket,
      messageContent: newMessage,
      isMessageEmpty: !newMessage.trim(),
      socketConnected: socket?.isConnected(),
      channelId,
      userId,
      userName: user?.fullName || user?.username
    });

    if (!socket || !isConnected) {
      console.log('[Send] ❌ Blocked: No socket connection');
      return;
    }
    if (!newMessage.trim()) {
      console.log('[Send] ❌ Blocked: Empty message');
      return;
    }
    
    const content = newMessage.trim();
    console.log('[Send] ✅ All checks passed, preparing message');
    setNewMessage(''); // Clear input immediately
    
    // Create temporary message
    const tempMessage: Message = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${userId}`,
      content,
      channelId,
      userId: userId || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        id: userId || '',
        name: user?.fullName || user?.username || 'Unknown User',
        imageUrl: user?.imageUrl || undefined
      } as MessageUser,
      reactions: [],
      isRead: false,
      isDelivered: false,
      replyToId: null
    };
    
    try {
      // Add temporary message to UI
      setLocalMessages(prev => [...prev, tempMessage]);
      setMessageStatuses(prev => [...prev, { id: tempMessage.id, status: 'sending' }]);

      // Send message through socket with correct payload
      console.log('[Send] 🚀 Sending message:', {
        content,
        channelId,
        tempId: tempMessage.id
      });
      
      socket.emit('message:send', {
        content,
        channelId,
        tempId: tempMessage.id
      });

      // Note: We don't need to handle response here anymore
      // The socket event handlers above will handle all responses
      console.log('[Send] ====== MESSAGE SEND COMPLETE ======');
    } catch (error) {
      console.error('[Send] ❌ Error sending message:', error);
      // Remove the temporary message on error
      setLocalMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setMessageStatuses(prev => prev.filter(status => status.id !== tempMessage.id));
    }
  };

  // Fetch initial messages on mount and channel change
  useEffect(() => {
    if (channelId) {
      fetchMessages(channelId);
      // Clear local messages when channel changes
      setLocalMessages([]);
      setMessageStatuses([]);
    }
  }, [channelId, fetchMessages]);

  // Add load more function
  const handleLoadMore = () => {
    if (nextCursor && !isLoading) {
      fetchMessages(channelId, nextCursor);
    }
  };

  // Function to scroll to bottom
  const scrollToBottom = (behavior: 'auto' | 'smooth' = 'auto') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (historyMessages.length > 0) {
      scrollToBottom();
    }
  }, [historyMessages]);

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Channel: {channelName}</h2>
          <div className="text-sm text-gray-500">
            {isConnected ? (
              <span className="text-green-500">Connected</span>
            ) : (
              <span className="text-red-500">Disconnected</span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4"
      >
        {error && (
          <div className="text-center text-red-500 py-2">
            {error}
          </div>
        )}
        
        {nextCursor && (
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2"
          >
            {isLoading ? 'Loading...' : 'Load more messages'}
          </button>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className="flex flex-col items-start"
          >
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium text-gray-600">
                {message.user?.name || 'Unknown User'}
              </span>
              <div className={cn(
                "px-4 py-2 rounded-lg",
                message.userId === userId 
                  ? "bg-green-100 text-black" 
                  : "bg-gray-100 text-gray-900"
              )}>
                {message.content}
              </div>
              
              {/* Add MessageReactions component */}
              {userId && (
                <MessageReactions
                  message={message}
                  currentUserId={userId}
                />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
              {message.userId === userId && (
                <>
                  {messageStatuses.find(status => status.id === message.id)?.status === 'sending' && (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Sending
                    </span>
                  )}
                  {messageStatuses.find(status => status.id === message.id)?.status === 'sent' && (
                    <CheckIcon className="h-3 w-3" />
                  )}
                  {messageStatuses.find(status => status.id === message.id)?.status === 'delivered' && (
                    <CheckCheckIcon className="h-3 w-3" />
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div className="border-t">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-4 flex gap-2"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected}
            className="min-w-[80px] px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
} 