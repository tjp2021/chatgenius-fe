'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Message, MessageDeliveryStatus } from '@/types/message';

export default function ChatTestPage() {
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [channelId, setChannelId] = useState('20d6a357-91e3-4ffe-afdd-5b4c688a775f');
  const [hasJoined, setHasJoined] = useState(false);

  // Connection Status
  const connectionStatus = isConnected ? 'Connected' : 'Disconnected';
  
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
    
    try {
      const tempId = Date.now().toString();
      const response = await socket.sendMessage<Message>(channelId, messageInput, tempId);
      if (response.success && response.data) {
        setMessageInput('');
        toast({
          title: 'Message Sent',
          description: 'Message sent successfully'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    }
  };

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    // Message handler
    const handleNewMessage = (message: Message) => {
      console.log('New message received:', message);
      setMessages(prev => [...prev, message]);
      socket.confirmDelivery(message.id);
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
    socket.onNewMessage<Message>(handleNewMessage);
    socket.on('channel:joined', handleChannelJoined);
    socket.on('channel:left', handleChannelLeft);
    socket.on('channel:error', handleChannelError);

    // Cleanup
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('channel:joined', handleChannelJoined);
      socket.off('channel:left', handleChannelLeft);
      socket.off('channel:error', handleChannelError);
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
        <div className="h-[300px] overflow-y-auto border rounded p-2 mb-2">
          {messages.map((msg) => (
            <div key={msg.id} className="p-2 hover:bg-accent rounded">
              <div className="font-medium">{msg.sender.name}</div>
              <div>{msg.content}</div>
              <div className="text-xs text-muted-foreground">
                {msg.isDelivered ? 'Delivered' : 'Sent'}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground">
              No messages yet
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={!isConnected || !hasJoined}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!isConnected || !hasJoined}
          >
            Send
          </Button>
        </div>
      </Card>

      {/* Debug Info */}
      <Card className="p-4">
        <h2 className="font-semibold mb-2">Debug Info</h2>
        <pre className="text-xs bg-accent p-2 rounded">
          {JSON.stringify({
            connected: isConnected,
            channelId,
            hasJoined,
            messageCount: messages.length
          }, null, 2)}
        </pre>
      </Card>
    </div>
  );
} 