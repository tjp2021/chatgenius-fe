'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChannelSocket } from '@/hooks/useChannelSocket';
import { Message } from '@/types/message';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@clerk/nextjs';
import { CheckIcon, CheckCheckIcon } from 'lucide-react';

interface ChatWindowProps {
  channelId: string;
  initialMessages?: Message[];
}

interface MessageStatus {
  id: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

export function ChatWindow({ channelId, initialMessages = [] }: ChatWindowProps) {
  const { toast } = useToast();
  const { userId } = useAuth();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<string[]>([]);
  const [messageStatuses, setMessageStatuses] = useState<MessageStatus[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const {
    sendMessage,
    markAsRead,
    joinChannel,
    leaveChannel,
    startTyping,
    stopTyping,
    isConnected,
    error
  } = useChannelSocket({
    channelId,
    userId: userId!,
    onNewMessage: (message) => {
      setMessages(prev => [...prev, message]);
      setUnreadMessages(prev => [...prev, message.id]);
    },
    onMessageDelivered: (messageId) => {
      setMessageStatuses(prev => 
        prev.map(status => 
          status.id === messageId 
            ? { ...status, status: 'delivered' as const }
            : status
        )
      );
    },
    onMessageRead: (messageId) => {
      setMessageStatuses(prev => 
        prev.map(status => 
          status.id === messageId 
            ? { ...status, status: 'read' as const }
            : status
        )
      );
    },
    onTypingStart: (typingUserId) => {
      setTypingUsers(prev => Array.from(new Set([...prev, typingUserId])));
    },
    onTypingStop: (typingUserId) => {
      setTypingUsers(prev => prev.filter(id => id !== typingUserId));
    },
    onJoinSuccess: () => {
      setIsJoined(true);
      toast({
        title: 'Channel Joined',
        description: `Successfully joined channel ${channelId}`,
      });
    },
    onLeaveSuccess: () => {
      setIsJoined(false);
      setMessages([]);
      setUnreadMessages([]);
      setMessageStatuses([]);
      setTypingUsers([]);
      toast({
        title: 'Channel Left',
        description: `Successfully left channel ${channelId}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle marking messages as read
  useEffect(() => {
    if (!isJoined || unreadMessages.length === 0) return;

    const markMessagesAsRead = async () => {
      try {
        await Promise.all(unreadMessages.map(id => markAsRead(id)));
        setUnreadMessages([]);
      } catch (error) {
        console.error('Failed to mark messages as read:', error);
      }
    };

    markMessagesAsRead();
  }, [unreadMessages, isJoined, markAsRead]);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Connection Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const handleJoinChannel = async () => {
    try {
      await joinChannel();
    } catch (error) {
      console.error('Failed to join channel:', error);
    }
  };

  const handleLeaveChannel = async () => {
    try {
      await leaveChannel();
    } catch (error) {
      console.error('Failed to leave channel:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isJoined) return;

    const tempId = Date.now().toString();
    const tempMessage: Message = {
      id: tempId,
      content: newMessage.trim(),
      channelId,
      userId: userId!,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isRead: false,
      isDelivered: false,
      sender: { id: userId!, name: 'You' }
    };

    // Add temporary message and status
    setMessages(prev => [...prev, tempMessage]);
    setMessageStatuses(prev => [...prev, { id: tempId, status: 'sending' }]);
    setNewMessage('');

    try {
      await sendMessage(newMessage.trim());
      // Update status to sent
      setMessageStatuses(prev => 
        prev.map(status => 
          status.id === tempId 
            ? { ...status, status: 'sent' as const }
            : status
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove temporary message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setMessageStatuses(prev => prev.filter(status => status.id !== tempId));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Channel: {channelId}</h2>
          <div className="space-x-2">
            {!isJoined ? (
              <button
                onClick={handleJoinChannel}
                disabled={!isConnected}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Join Channel
              </button>
            ) : (
              <button
                onClick={handleLeaveChannel}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Leave Channel
              </button>
            )}
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Status: {isConnected ? 'Connected' : 'Disconnected'}
          {isJoined && ' (Joined)'}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 p-3 bg-white rounded-lg shadow-sm ${
              message.userId === userId ? 'ml-auto max-w-[80%]' : 'mr-auto max-w-[80%]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{message.sender.name}</span>
              <span className="text-xs text-gray-500">
                {new Date(message.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <p className="mt-1 text-gray-700">{message.content}</p>
            {message.userId === userId && (
              <div className="flex justify-end mt-1">
                {messageStatuses.find(status => status.id === message.id)?.status === 'sending' && (
                  <span className="text-gray-400 text-xs">Sending...</span>
                )}
                {messageStatuses.find(status => status.id === message.id)?.status === 'sent' && (
                  <CheckIcon className="w-4 h-4 text-gray-400" />
                )}
                {messageStatuses.find(status => status.id === message.id)?.status === 'delivered' && (
                  <CheckCheckIcon className="w-4 h-4 text-gray-400" />
                )}
                {messageStatuses.find(status => status.id === message.id)?.status === 'read' && (
                  <CheckCheckIcon className="w-4 h-4 text-blue-500" />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500">
          {typingUsers.length === 1
            ? 'Someone is typing...'
            : `${typingUsers.length} people are typing...`}
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            disabled={!isJoined}
            placeholder={isJoined ? "Type a message..." : "Join channel to send messages"}
            className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isJoined || !newMessage.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
} 