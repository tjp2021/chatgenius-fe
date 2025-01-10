'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  userIds: string[];
  className?: string;
}

export const TypingIndicator = ({
  userIds,
  className
}: TypingIndicatorProps) => {
  const [dots, setDots] = useState('');

  // Animate the dots
  useEffect(() => {
    if (userIds.length === 0) return;

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [userIds.length]);

  if (userIds.length === 0) return null;

  return (
    <div 
      className={cn(
        "text-sm text-muted-foreground animate-pulse",
        className
      )}
      aria-live="polite"
    >
      {userIds.length === 1 ? (
        <span>Someone is typing{dots}</span>
      ) : (
        <span>{userIds.length} people are typing{dots}</span>
      )}
    </div>
  );
}; 