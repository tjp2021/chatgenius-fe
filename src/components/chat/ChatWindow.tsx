'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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

  // Join channel on mount
  useEffect(() => {
    if (!socket || !isConnected) return;
    handleJoinChannel();
    // Cleanup on unmount
    return () => {
      if (isJoined) {
        handleLeaveChannel();
      }
    };
  }, [socket, isConnected]);

  // Listen for messages
  useEffect(() => {
    if (!socket) return;

    // Handle new messages (either pending or delivered)
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
        
        setMessageStatuses(prev => {
          const tempStatus = prev.find(s => 
            s.id.startsWith('temp-') && 
            messages.find(m => m.id === s.id)?.content === message.content
          );
          
          if (tempStatus) {
            // Update the status of the temporary message
            return prev.map(s => 
              s.id === tempStatus.id 
                ? { id: message.id, status: 'delivered' }
                : s
            );
          }
          
          return [...prev, { id: message.id, status: 'delivered' }];
        });
      }
    };

    // Handle message persistence confirmation
    const handleMessageSaved = ({ tempId, message }: { tempId: string, message: Message }) => {
      console.log('[Socket] Message saved:', { tempId, message });
      
      if (message.channelId === channelId) {
        setLocalMessages(prev => 
          prev.map(m => m.id === tempId ? message : m)
        );
        setMessageStatuses(prev => 
          prev.map(status => 
            status.id === tempId 
              ? { id: message.id, status: 'sent' }
              : status
          )
        );
      }
    };

    // Handle message errors
    const handleMessageError = ({ tempId, error }: { tempId: string, error: string }) => {
      console.log('[Socket] Message error:', { tempId, error });
      
      toast({
        title: 'Error',
        description: error || 'Failed to send message',
        variant: 'destructive'
      });

      // Remove the temporary message
      setLocalMessages(prev => prev.filter(m => m.id !== tempId));
      setMessageStatuses(prev => prev.filter(status => status.id !== tempId));
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:saved', handleMessageSaved);
    socket.on('message:error', handleMessageError);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:saved', handleMessageSaved);
      socket.off('message:error', handleMessageError);
    };
  }, [socket, channelId, toast, messages]);

  const handleJoinChannel = async () => {
    if (!socket) return;
    try {
      // Emit join_channel event and wait for response
      socket.emit('join_channel', { channelId }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          setIsJoined(true);
        } else {
          toast({
            title: 'Error',
            description: response.error || 'Failed to join channel',
            variant: 'destructive'
          });
        }
      });
    } catch (error) {
      console.error('Join channel error:', error);
      toast({
        title: 'Error',
        description: 'Failed to join channel',
        variant: 'destructive'
      });
    }
  };

  const handleLeaveChannel = async () => {
    if (!socket) return;
    try {
      await socket.leaveChannel(channelId);
      setIsJoined(false);
      setLocalMessages([]);
      setMessageStatuses([]);
    } catch (error) {
      console.error('Failed to leave channel:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!socket || !newMessage.trim() || !isJoined) return;
    
    const content = newMessage.trim();
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
      
      // Add temporary message to UI
      setLocalMessages(prev => [...prev, tempMessage]);
      setMessageStatuses(prev => [...prev, { id: tempMessage.id, status: 'sending' }]);

      // Send message through socket
      socket.emit('message:send', {
        content,
        channelId,
        tempId: tempMessage.id
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
      setNewMessage(content); // Restore the message content
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
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-white">
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
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage}
            size="icon"
            className="h-10 w-10"
            variant="ghost"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
} 