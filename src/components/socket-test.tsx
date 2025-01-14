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
    error,
    socket
  } = useSocket();

  // Add status updates
  useEffect(() => {
    const addStatus = (msg: string) => {
      setStatus(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    };

    if (isConnected) {
      addStatus('Socket connected');
    } else {
      addStatus('Socket disconnected');
    }

    if (error) {
      addStatus(`Error: ${error.message}`);
    }
  }, [isConnected, error]);

  const handleSendMessage = async () => {
    if (!socket || !message.trim()) return;
    try {
      socket.emit('message:send', { channelId, content: message });
      setMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <Card className="p-4 max-w-xl mx-auto my-8">
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Socket Status</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Connected:</div>
            <div>{isConnected ? '✅' : '❌'}</div>
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm">
            Error: {error.message}
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Test Controls</h2>
          <div className="flex gap-2">
            <Input
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="Channel ID"
            />
          </div>
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message"
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!isConnected}
              className="flex-1"
            >
              Send
            </Button>
          </div>
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