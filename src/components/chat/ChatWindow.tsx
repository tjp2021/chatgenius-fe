'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Message } from '@/types/message';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@clerk/nextjs';
import { CheckIcon, CheckCheckIcon, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useChannelContext } from '@/contexts/channel-context';

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
  const { channels } = useChannelContext();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [messageStatuses, setMessageStatuses] = useState<MessageStatus[]>([]);

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

    const handleNewMessage = (message: Message) => {
      if (message.channelId === channelId) {
        setMessages(prev => [...prev, message]);
      }
    };

    socket.onNewMessage(handleNewMessage);

    return () => {
      socket.offNewMessage(handleNewMessage);
    };
  }, [socket, channelId]);

  const handleJoinChannel = async () => {
    if (!socket) return;
    try {
      const response = await socket.joinChannel(channelId);
      if (response.success) {
        setIsJoined(true);
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to join channel',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to join channel:', error);
    }
  };

  const handleLeaveChannel = async () => {
    if (!socket) return;
    try {
      await socket.leaveChannel(channelId);
      setIsJoined(false);
      setMessages([]);
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
      const tempId = Date.now().toString();
      const response = await socket.sendMessage<Message>(channelId, content, tempId);
      if (response.success && response.data) {
        setMessageStatuses(prev => [...prev, { id: tempId, status: 'sent' }]);
      } else {
        toast({
          title: 'Warning',
          description: 'Message sent but no confirmation received',
          variant: 'default'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
      setNewMessage(content); // Restore the message if sending failed
    }
  };

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
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex flex-col ${message.userId === userId ? 'items-end' : 'items-start'}`}
          >
            <div className={`flex items-center gap-2 mb-1 ${message.userId === userId ? 'flex-row-reverse' : 'flex-row'}`}>
              <span className="text-sm font-medium text-gray-600">
                {message.sender?.name || 'Unknown User'}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(message.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <div 
              className={`max-w-[80%] rounded-lg p-3 ${
                message.userId === userId
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
            {message.userId === userId && (
              <div className="flex justify-end mt-1">
                {messageStatuses.find(status => status.id === message.id)?.status === 'sending' && (
                  <span className="text-xs text-gray-500">Sending...</span>
                )}
                {messageStatuses.find(status => status.id === message.id)?.status === 'sent' && (
                  <CheckIcon className="w-4 h-4 text-gray-400" />
                )}
                {messageStatuses.find(status => status.id === message.id)?.status === 'delivered' && (
                  <CheckCheckIcon className="w-4 h-4 text-gray-400" />
                )}
              </div>
            )}
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