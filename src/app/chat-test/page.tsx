'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Message } from '@/types/message';
import { Send } from 'lucide-react';
import { useSocket } from '@/providers/socket-provider';
import { useAuth } from '@clerk/nextjs';

export default function ChatTestPage() {
  const { socket, isConnected: socketConnected } = useSocket();
  const { userId } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [channelId, setChannelId] = useState('f47ac10b-58cc-4372-a567-0e02b2c3d479');
  const [hasJoined, setHasJoined] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const { toast } = useToast();

  // Track socket connection
  useEffect(() => {
    setIsConnected(socketConnected);
    setConnectionStatus(socketConnected ? 'Connected' : 'Disconnected');
  }, [socketConnected]);

  // Join Channel
  const handleJoinChannel = async () => {
    if (!socket || !isConnected) {
      toast({
        title: 'Error',
        description: 'Socket not connected',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      console.log('Attempting to join channel:', channelId);
      const response = await socket.joinChannel(channelId);
      console.log('Join response:', response);
      
      if (response.success) {
        setHasJoined(true);
        toast({
          title: 'Joined Channel',
          description: `Successfully joined channel: ${channelId}`
        });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to join channel',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Join channel error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to join channel',
        variant: 'destructive'
      });
    }
  };

  // Leave Channel
  const handleLeaveChannel = async () => {
    if (!socket || !isConnected) {
      toast({
        title: 'Error',
        description: 'Socket not connected',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      console.log('Attempting to leave channel:', channelId);
      const response = await socket.leaveChannel(channelId);
      console.log('Leave response:', response);
      
      if (response.success) {
        setHasJoined(false);
        setMessages([]);
        toast({
          title: 'Left Channel',
          description: `Successfully left channel: ${channelId}`
        });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to leave channel',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Leave channel error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to leave channel',
        variant: 'destructive'
      });
    }
  };

  // Send Message
  const handleSendMessage = async () => {
    if (!socket || !messageInput.trim()) return;
    
    const content = messageInput.trim();
    setMessageInput(''); // Clear input immediately
    
    try {
      const tempId = Date.now().toString();
      const response = await socket.sendMessage(channelId, content, tempId);
      if (response.success && response.data) {
        toast({
          title: 'Message Sent',
          description: 'Message sent successfully'
        });
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
      setMessageInput(content); // Restore the message if sending failed
    }
  };

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    // Message handler
    const handleNewMessage = (rawMessage: any) => {
      console.log('New message received:', JSON.stringify(rawMessage, null, 2));
      
      // Transform the raw message into our expected format
      const message: Message = {
        id: rawMessage.id || rawMessage.tempId || Date.now().toString(),
        content: rawMessage.content,
        channelId: rawMessage.channelId,
        userId: rawMessage.senderId || rawMessage.userId,
        createdAt: rawMessage.createdAt || rawMessage.timestamp || new Date().toISOString(),
        updatedAt: rawMessage.updatedAt || rawMessage.timestamp || new Date().toISOString(),
        isRead: false,
        isDelivered: false,
        user: {
          id: rawMessage.senderId || rawMessage.userId,
          name: rawMessage.sender?.name || `User ${(rawMessage.senderId || rawMessage.userId || '').split('_')[1]?.slice(0, 8)}`,
        },
        reactions: [],
        replyToId: null
      };

      setMessages(prev => [...prev, message]);
      if (message.id) {
        socket.confirmDelivery(message.id);
      }
    };

    // Channel event handlers
    const handleChannelJoined = (data: any) => {
      console.log('Channel joined event:', data);
      setHasJoined(true);
    };

    const handleChannelLeft = (data: any) => {
      console.log('Channel left event:', data);
      setHasJoined(false);
      setMessages([]);
    };

    const handleChannelError = (error: any) => {
      console.error('Channel error:', error);
      toast({
        title: 'Channel Error',
        description: error.message || 'An error occurred with the channel',
        variant: 'destructive'
      });
    };

    // Set up event listeners
    socket.onNewMessage(handleNewMessage);
    socket.onChannelJoined(handleChannelJoined);
    socket.onChannelLeft(handleChannelLeft);
    socket.onChannelError(handleChannelError);

    // Cleanup
    return () => {
      socket.offNewMessage(handleNewMessage);
      socket.offChannelJoined(handleChannelJoined);
      socket.offChannelLeft(handleChannelLeft);
      socket.offChannelError(handleChannelError);
    };
  }, [socket, toast]);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Chat Test Sandbox</h1>
      
      {/* Connection Status */}
      <Card className="p-4">
        <h2 className="font-semibold mb-2">Connection Status</h2>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{connectionStatus}</span>
        </div>
      </Card>

      {/* Channel Controls */}
      <Card className="p-4">
        <h2 className="font-semibold mb-2">Channel Controls</h2>
        <div className="flex gap-2 mb-2">
          <Input 
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            placeholder="Channel ID"
          />
          <Button 
            onClick={handleJoinChannel}
            disabled={!isConnected || hasJoined}
          >
            Join
          </Button>
          <Button 
            onClick={handleLeaveChannel}
            disabled={!isConnected || !hasJoined}
            variant="destructive"
          >
            Leave
          </Button>
        </div>
      </Card>

      {/* Message List */}
      <Card className="p-4">
        <h2 className="font-semibold mb-2">Messages</h2>
        <div className="h-[400px] overflow-y-auto border rounded p-4 mb-2 space-y-4 bg-muted/30">
          {messages.map((msg) => {
            const isCurrentUser = msg.user?.id !== msg.userId;
            return (
              <div 
                key={msg.id || Date.now()} 
                className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}
              >
                <div className={`flex items-center gap-2 mb-1 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-sm font-medium text-muted-foreground">
                    {msg.user?.name || 'Unknown User'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div 
                  className={`max-w-[80%] rounded-lg p-3 ${
                    isCurrentUser
                      ? 'bg-primary text-primary-foreground mr-0 ml-8' 
                      : 'bg-accent text-accent-foreground ml-0 mr-8'
                  }`}>
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}