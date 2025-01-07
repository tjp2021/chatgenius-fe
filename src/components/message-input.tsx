'use client';

import { useState } from 'react';
import { useSocket } from '@/providers/socket-provider';

export const MessageInput = ({ channelId }: { channelId: string }) => {
  const [content, setContent] = useState('');
  const socket = useSocket();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    socket?.emit('message:send', {
      channelId,
      content: content.trim(),
    });

    setContent('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type a message..."
        className="w-full p-2 rounded-lg border focus:outline-none focus:ring-2"
      />
    </form>
  );
}; 