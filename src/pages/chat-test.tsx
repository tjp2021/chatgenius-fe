'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useSocket } from '@/hooks/useSocket';

export default function ChatTestPage() {
  const { isConnected } = useSocket();
  const [channelId, setChannelId] = useState('20d6a357-91c3-4ffe-afdd-5b4c688a775f');
  const [newChannelId, setNewChannelId] = useState('');

  const handleChangeChannel = () => {
    if (newChannelId.trim()) {
      setChannelId(newChannelId.trim());
      setNewChannelId('');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Chat Test Sandbox</h1>
      
      <Card className="p-4 mb-4">
        <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </Card>

      <Card className="p-4 mb-4">
        <h2 className="text-lg font-semibold mb-2">Channel Controls</h2>
        <div className="flex items-center gap-2">
          <Input
            value={newChannelId}
            onChange={(e) => setNewChannelId(e.target.value)}
            placeholder="Enter channel ID..."
            className="flex-1"
          />
          <Button onClick={handleChangeChannel}>Change Channel</Button>
        </div>
        <div className="mt-2 text-sm text-gray-500">
          Current Channel: {channelId}
        </div>
      </Card>

      <Card className="p-4">
        <ChatWindow channelId={channelId} />
      </Card>

      <Card className="p-4 mt-4">
        <h2 className="text-lg font-semibold mb-2">Debug Info</h2>
        <pre className="whitespace-pre-wrap text-sm">
          {JSON.stringify({
            connected: isConnected,
            channelId: channelId,
          }, null, 2)}
        </pre>
      </Card>
    </div>
  );
} 