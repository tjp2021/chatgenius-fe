'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface TypingIndicatorProps {
  typingUsers: Record<string, boolean>;
  userNames: Record<string, string>;
}

export function TypingIndicator({ typingUsers, userNames }: TypingIndicatorProps) {
  const [displayText, setDisplayText] = useState<string>('');

  useEffect(() => {
    const activeTypers = Object.entries(typingUsers)
      .filter(([_, isTyping]) => isTyping)
      .map(([userId]) => userNames[userId] || 'Someone');

    if (activeTypers.length === 0) {
      setDisplayText('');
    } else if (activeTypers.length === 1) {
      setDisplayText(`${activeTypers[0]} is typing`);
    } else if (activeTypers.length === 2) {
      setDisplayText(`${activeTypers[0]} and ${activeTypers[1]} are typing`);
    } else {
      setDisplayText('Several people are typing');
    }
  }, [typingUsers, userNames]);

  if (!displayText) return null;

  return (
    <div 
      className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-1"
      data-testid="typing-indicator"
    >
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>{displayText}...</span>
    </div>
  );
} 