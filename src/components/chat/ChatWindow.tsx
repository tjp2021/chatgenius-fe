'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Message, MessageDeliveryStatus, MessageUser } from '@/types/message';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@clerk/nextjs';
import { CheckIcon, CheckCheckIcon, Send, Loader2, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useChannelContext } from '@/contexts/channel-context';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';
import { useMessageHistory } from '@/hooks/use-message-history';
import { MessageReactions } from './message-reactions';
import { useThreadStore } from '@/hooks/use-thread-store';
import { ThreadView } from './thread-view';
import { useThread } from '@/hooks/use-thread';
import { SOCKET_EVENTS } from '@/constants/socket-events';
import { MessageInput } from './message-input';
import { ChannelHeader } from './channel-header';
import { channelSearch } from '@/lib/api';
import { auth } from '@clerk/nextjs';

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
  const { userId, getToken } = useAuth();
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

  // Replace thread store with thread hook
  const { createThread } = useThread();
  const { isLoading: isThreadLoading, activeThread } = useThreadStore();

  // Add this at the top with other store hooks
  const clearThread = useThreadStore((state) => state.clearThread);

  // Add search results state
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const handleClearSearch = () => {
    setSearchResults([]);
    setIsSearchMode(false);
  };

  const handleChannelSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]); // Clear previous results
    setIsSearchMode(true); // Enter search mode
    
    try {
      const token = await getToken();
      
      if (!token || !userId) {
        throw new Error('Not authenticated');
      }

      const response = await channelSearch({
        channelId,
        query: query.trim(),
        token,
        userId,
        limit: 50
      });
      
      // Map the results to include the correct timestamp from metadata
      const resultsWithDates = response.items.map((item: any) => ({
        ...item,
        createdAt: item.metadata?.timestamp || item.timestamp || new Date().toISOString(),
        user: {
          ...item.user,
          name: item.user?.name || item.userName || 'Unknown'
        }
      }));
      
      setSearchResults(resultsWithDates);
    } catch (error) {
      console.error('Channel search error:', error);
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to search messages",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Update the messages memo to handle search results
  const displayMessages = useMemo(() => {
    if (isSearchMode && searchResults.length > 0) {
      return searchResults;
    }

    // Create a Map to store unique messages, with the most recent version taking precedence
    const messageMap = new Map<string, Message>();
    
    // Add local messages first (they take precedence)
    localMessages.forEach(msg => {
      // Only add messages that are not replies (no replyToId)
      if (!msg.replyToId) {
        messageMap.set(msg.id, msg);
      }
    });

    // Add history messages if they don't exist in local messages
    historyMessages.forEach(msg => {
      // Only add messages that are not replies (no replyToId)
      if (!msg.replyToId && !messageMap.has(msg.id)) {
        messageMap.set(msg.id, msg);
      }
    });

    // Convert map to array and sort by creation time
    return Array.from(messageMap.values()).sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [historyMessages, localMessages, isSearchMode, searchResults]);

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
      messageCount: displayMessages.length,
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

    const handleNewMessage = (message: Message) => {
      console.log('CRITICAL - message:new received:', message);
      
      // Only add the message if it's not already in our local messages
      // and it's for the current channel
      if (message.channelId === channelId) {
        setLocalMessages(prev => {
          if (prev.some(m => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });

        // Send delivery confirmation
        socket.emit(SOCKET_EVENTS.MESSAGE.RECEIVED, {
          messageId: message.id,
          processed: true
        });
      }
    };

    socket.on(SOCKET_EVENTS.MESSAGE.DELIVERED, handleMessageDelivered);
    socket.on(SOCKET_EVENTS.MESSAGE.CREATED, handleMessageCreated);
    socket.on(SOCKET_EVENTS.MESSAGE.FAILED, handleMessageFailed);
    socket.on(SOCKET_EVENTS.MESSAGE.NEW, handleNewMessage);

    return () => {
      console.log('CRITICAL - Cleaning up socket listeners');
      socket.off(SOCKET_EVENTS.MESSAGE.DELIVERED, handleMessageDelivered);
      socket.off(SOCKET_EVENTS.MESSAGE.CREATED, handleMessageCreated);
      socket.off(SOCKET_EVENTS.MESSAGE.FAILED, handleMessageFailed);
      socket.off(SOCKET_EVENTS.MESSAGE.NEW, handleNewMessage);
    };
  }, [socket, isConnected, channelId, messageStatuses, localMessages, displayMessages]);

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
      replyToId: null,
      hasReplies: false
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
      // Clear thread state when channel changes
      clearThread();
    }
  }, [channelId, fetchMessages, clearThread]);

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
  }, [displayMessages]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (historyMessages.length > 0) {
      scrollToBottom();
    }
  }, [historyMessages]);

  return (
    <div className="flex h-[600px] w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Main chat area */}
      <div className="flex flex-col flex-1">
        {/* Replace old header with new ChannelHeader */}
        <ChannelHeader
          channelName={channelName}
          isConnected={isConnected}
          onSearch={handleChannelSearch}
          onClearSearch={handleClearSearch}
          isSearchMode={isSearchMode}
        />

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
          
          {/* Show search results if searching */}
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isSearchMode ? (
            <>
              <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
                <span>Found {searchResults.length} messages</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSearch}
                >
                  Exit Search
                </Button>
              </div>
              {searchResults.map((message) => (
                <div
                  key={`${message.id}-${message.createdAt}`}
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
                    
                    <div className="flex items-center gap-2">
                      {userId && (
                        <MessageReactions
                          message={message}
                          currentUserId={userId}
                        />
                      )}
                      <button
                        className={cn(
                          "p-1.5 rounded-full hover:bg-gray-100 transition-colors",
                          (message.hasReplies || isThreadLoading || activeThread?.id === message.id) 
                            ? "text-blue-500" 
                            : "text-muted-foreground"
                        )}
                        onClick={async () => {
                          try {
                            await createThread(message.id, {
                              content: message.content,
                              createdAt: message.createdAt,
                              user: message.user
                            });
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to create thread",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={isThreadLoading}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                    </div>
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
            </>
          ) : (
            <>
              {nextCursor && (
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2"
                >
                  {isLoading ? 'Loading...' : 'Load more messages'}
                </button>
              )}

              {displayMessages.map((message) => (
                <div
                  key={`${message.id}-${message.createdAt}`}
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
                    
                    <div className="flex items-center gap-2">
                      {userId && (
                        <MessageReactions
                          message={message}
                          currentUserId={userId}
                        />
                      )}
                      <button
                        className={cn(
                          "p-1.5 rounded-full hover:bg-gray-100 transition-colors",
                          (message.hasReplies || isThreadLoading || activeThread?.id === message.id) 
                            ? "text-blue-500" 
                            : "text-muted-foreground"
                        )}
                        onClick={async () => {
                          try {
                            await createThread(message.id, {
                              content: message.content,
                              createdAt: message.createdAt,
                              user: message.user
                            });
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to create thread",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={isThreadLoading}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                    </div>
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
            </>
          )}
        </div>

        {/* Message Input */}
        <MessageInput channelId={channelId} />
      </div>

      {/* Thread view */}
      <ThreadView />
    </div>
  );
} 