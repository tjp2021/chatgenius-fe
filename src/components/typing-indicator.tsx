'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { MessageEvent, TypingIndicator } from '@/types';
import { FEATURES } from '@/config/features';

export function TypingIndicatorDisplay({ channelId }: { channelId: string }) {
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !FEATURES.ENABLE_REAL_TIME_FEATURES) return;

    const handleTypingStart = (indicator: TypingIndicator) => {
      setTypingUsers(prev => {
        if (prev.some(u => u.userId === indicator.userId)) return prev;
        return [...prev, indicator];
      });
    };

    const handleTypingStop = (indicator: TypingIndicator) => {
      setTypingUsers(prev => 
        prev.filter(u => u.userId !== indicator.userId)
      );
    };

    socket.on(MessageEvent.TYPING_START, handleTypingStart);
    socket.on(MessageEvent.TYPING_STOP, handleTypingStop);

    return () => {
      socket.off(MessageEvent.TYPING_START, handleTypingStart);
      socket.off(MessageEvent.TYPING_STOP, handleTypingStop);
    };
  }, [socket, channelId]);

  if (!typingUsers.length) return null;

  return (
    <div className="px-4 py-2 text-sm text-muted-foreground">
      {typingUsers.length === 1 ? (
        <p>{typingUsers[0].username} is typing...</p>
      ) : typingUsers.length === 2 ? (
        <p>{typingUsers[0].username} and {typingUsers[1].username} are typing...</p>
      ) : (
        <p>Several people are typing...</p>
      )}
    </div>
  );
} 