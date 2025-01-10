'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export const SocketTest = () => {
  const [message, setMessage] = useState('');
  const [channelId, setChannelId] = useState('test-channel');
  const [status, setStatus] = useState<string[]>([]);
  
  const {
    isConnected,
    isAuthReady,
    isSocketReady,
    isConnecting,
    error,
    sendMessage,
    markAsRead
  } = useSocket();

  // Add status updates
  useEffect(() => {
    const addStatus = (msg: string) => {
      setStatus(prev => [...prev, `${new Date().toISOString()} - ${msg}`].slice(-10));
    };

    if (isConnecting) addStatus('🔄 Connecting...');
    if (isConnected) addStatus('🟢 Connected');
    if (!isConnected) addStatus('🔴 Disconnected');
    if (error) addStatus(`❌ Error: ${error.message}`);
  }, [isConnecting, isConnected, error]);

  const handleSendMessage = async () => {
    try {
      setStatus(prev => [...prev, '📤 Sending message...']);
      await sendMessage(channelId, message);
      setStatus(prev => [...prev, '✅ Message sent successfully']);
      setMessage('');
    } catch (error) {
      setStatus(prev => [...prev, `❌ Send error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  };

  const handleMarkAsRead = () => {
    try {
      markAsRead('test-message-id', channelId);
      setStatus(prev => [...prev, '👁️ Marked as read']);
    } catch (error) {
      setStatus(prev => [...prev, `❌ Mark read error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  };

  return (
    <Card className="p-4 max-w-xl mx-auto my-8">
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Socket Status</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Auth Ready: <span className={isAuthReady ? 'text-green-500' : 'text-red-500'}>{isAuthReady ? '✓' : '×'}</span></div>
            <div>Socket Ready: <span className={isSocketReady ? 'text-green-500' : 'text-red-500'}>{isSocketReady ? '✓' : '×'}</span></div>
            <div>Connected: <span className={isConnected ? 'text-green-500' : 'text-red-500'}>{isConnected ? '✓' : '×'}</span></div>
            <div>Connecting: <span className={isConnecting ? 'text-yellow-500' : 'text-gray-500'}>{isConnecting ? '...' : '-'}</span></div>
          </div>
          {error && (
            <div className="text-red-500 text-sm">
              Error: {error.message}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Test Controls</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Channel ID"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!isConnected || !message}
            >
              Send
            </Button>
          </div>
          <Button 
            onClick={handleMarkAsRead}
            disabled={!isConnected}
            variant="outline"
            className="w-full"
          >
            Mark as Read
          </Button>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Event Log</h2>
          <div className="bg-gray-100 rounded p-2 h-[200px] overflow-y-auto space-y-1">
            {status.map((msg, i) => (
              <div key={i} className="text-sm font-mono">
                {msg}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}; 