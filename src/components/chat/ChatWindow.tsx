'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Message } from '@/types/message';
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

export function ChatWindow({ channelId, initialMessages = [] }: ChatWindowProps) {
  console.log('ChatWindow mounting/updating', { channelId, initialMessages });
  
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const { userId } = useAuth();
  const { user } = useUser();
  const { channels } = useChannelContext();
  const [newMessage, setNewMessage] = useState('');
  const [isJoined, setIsJoined] = useState(false);
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

  const handleJoinChannel = useCallback(async () => {
    console.log('Attempting to join channel:', { 
      channelId, 
      socketExists: !!socket,
      socketConnected: socket?.connected,
      currentlyJoined: isJoined
    });
    
    if (!socket) return;
    
    try {
      console.log('CRITICAL: Emitting join_channel event', { 
        channelId, 
        socketId: socket.id,
        socketConnected: socket.connected,
        transport: socket.io.engine.transport.name
      });
      
      // Force isJoined to true immediately
      setIsJoined(true);
      
      // Emit join_channel event
      socket.emit('join_channel', { channelId });
      
    } catch (error) {
      console.error('Join channel error:', error);
      setIsJoined(false);
      toast({
        title: 'Error',
        description: 'Failed to join channel',
        variant: 'destructive'
      });
    }
  }, [socket, channelId, toast]);

  const handleLeaveChannel = useCallback(async () => {
    if (!socket) return;
    try {
      socket.emit('leave_channel', { channelId });
      setIsJoined(false);
      setLocalMessages([]);
      setMessageStatuses([]);
    } catch (error) {
      console.error('Failed to leave channel:', error);
    }
  }, [socket, channelId]);

  // Debug isJoined state
  useEffect(() => {
    console.log('isJoined state changed:', {
      isJoined,
      channelId,
      hasSocket: !!socket,
      isConnected
    });
  }, [isJoined, channelId, socket, isConnected]);

  // Combine all socket-related effects into one
  useEffect(() => {
    console.log('CRITICAL - Socket/Channel status:', {
      hasSocket: !!socket,
      isConnected,
      isJoined,
      channelId,
      socketId: socket?.getSocketId()
    });
    
    if (!socket || !isConnected) {
      console.log('CRITICAL - Socket not ready');
      setIsJoined(false);
      return;
    }

    // Join channel
    console.log('CRITICAL - Joining channel', channelId);
    socket.joinChannel(channelId).then(response => {
      if (response.success) {
        setIsJoined(true);
      } else {
        console.error('Failed to join channel:', response.error);
        toast({
          title: 'Error',
          description: response.error || 'Failed to join channel',
          variant: 'destructive'
        });
      }
    });

    // Listen for messages
    const handleNewMessage = (message: Message) => {
      console.log('[Socket] Received new message:', message);
      
      if (message.channelId === channelId) {
        setLocalMessages((prev: Message[]) => {
          // Check if we have a temporary version of this message
          const tempMessage = prev.find((m: Message) => 
            m.content === message.content && 
            m.userId === message.userId &&
            m.id.startsWith('temp-')
          );
          
          if (tempMessage) {
            // Replace temporary message with the saved one
            return prev.map((m: Message) => m.id === tempMessage.id ? message : m);
          }
          
          // Check if message already exists
          const messageExists = prev.some((m: Message) => m.id === message.id);
          if (messageExists) return prev;
          
          return [...prev, message];
        });
      }
    };

    // Handle message acknowledgment
    const handleMessageAck = (response: SocketResponse) => {
      console.log('[Socket] Message acknowledgment received:', response);
      
      if (response.success && response.message) {
        console.log('[Socket] Message saved successfully, updating UI');
        // Update local messages - replace temp message with saved one
        setLocalMessages(prev => prev.map(msg => 
          msg.id === response.message.tempId ? response.message : msg
        ));
        // Update message status
        setMessageStatuses(prev => prev.map(status =>
          status.id === response.message.tempId ? { ...status, status: 'sent' } : status
        ));
      } else {
        console.error('[Socket] Message save failed:', response.error);
        toast({
          title: 'Error',
          description: response.error || 'Failed to send message',
          variant: 'destructive'
        });
        // Remove the temporary message on failure
        if (response.message?.tempId) {
          setLocalMessages(prev => prev.filter(msg => msg.id !== response.message.tempId));
          setMessageStatuses(prev => prev.filter(status => status.id !== response.message.tempId));
        }
      }
    };

    socket.on('message_new', handleNewMessage);
    socket.on('message_sent', handleMessageAck);

    // Cleanup function
    return () => {
      console.log('CRITICAL - Cleaning up channel connection');
      socket.off('message_new', handleNewMessage);
      socket.off('message_sent', handleMessageAck);
      socket.leaveChannel(channelId).catch(error => {
        console.error('Error leaving channel:', error);
      });
      setIsJoined(false);
    };
  }, [socket, isConnected, channelId, toast]);

  const handleSendMessage = async () => {
    console.log('[Send] Starting send message process:', {
      hasSocket: !!socket,
      messageContent: newMessage,
      isMessageEmpty: !newMessage.trim(),
      isJoinedStatus: isJoined,
      socketConnected: socket?.isConnected(),
      channelId
    });

    if (!socket) {
      console.log('[Send] Blocked: No socket');
      return;
    }
    if (!newMessage.trim()) {
      console.log('[Send] Blocked: Empty message');
      return;
    }
    if (!isJoined) {
      console.log('[Send] Blocked: Not joined to channel');
      return;
    }
    
    const content = newMessage.trim();
    console.log('[Send] All checks passed, preparing message:', { content, channelId });
    setNewMessage(''); // Clear input immediately
    
    try {
      // Create temporary message
      const tempMessage: Message = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${userId}`,
        content,
        channelId,
        userId: userId || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isRead: false,
        isDelivered: false,
        user: {
          id: userId || '',
          name: user?.fullName || user?.username || 'Unknown User'
        },
        reactions: []
      };
      
      console.log('[Send] Created temp message:', tempMessage);
      
      // Add temporary message to UI
      setLocalMessages(prev => [...prev, tempMessage]);
      setMessageStatuses(prev => [...prev, { id: tempMessage.id, status: 'sending' }]);

      // Send message through socket
      console.log('[Send] Sending message:', {
        channelId,
        content,
        tempId: tempMessage.id
      });
      
      const response = await socket.sendMessage(channelId, content, tempMessage.id);
      console.log('[Send] Message sent response:', response);

      if (!response.success) {
        throw new Error(response.error || 'Failed to send message');
      }

      // Update message status if successful
      if (response.message) {
        setLocalMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id ? response.message : msg
        ));
        setMessageStatuses(prev => prev.map(status =>
          status.id === tempMessage.id ? { ...status, status: 'sent' } : status
        ));
      }
    } catch (error) {
      console.error('[Send] Error sending message:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive'
      });
      // Remove the temporary message on failure
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
            {isConnected && (
              <span className="ml-2">
                {isJoined ? (
                  <span className="text-green-500">(Joined)</span>
                ) : (
                  <span className="text-yellow-500">(Joining...)</span>
                )}
              </span>
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
            disabled={!newMessage.trim() || !isJoined}
            className="min-w-[80px] px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
} 