'use client';

import { useSocket } from '@/providers/socket-provider';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Loader2, AlertCircle, Check } from 'lucide-react';

interface MessageItemProps {
  message: {
    id: string;
    content: string;
    userId: string;
    userName: string;
    createdAt: string;
    isPending?: boolean;
    isFailed?: boolean;
    tempId?: string;
  };
  onRetry?: (tempId: string) => void;
}

export const MessageItem = ({ message, onRetry }: MessageItemProps) => {
  const { socket } = useSocket();
  const isCurrentUser = message.userId === socket?.auth?.userId;

  return (
    <div className={cn(
      "flex gap-2 w-full",
      isCurrentUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex flex-col max-w-[70%] space-y-1",
        isCurrentUser ? "items-end" : "items-start"
      )}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {message.userName}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
        </div>
        <div className={cn(
          "rounded-lg px-4 py-2",
          isCurrentUser 
            ? "bg-emerald-500 text-white" 
            : "bg-secondary"
        )}>
          {message.content}
        </div>
        {isCurrentUser && (
          <div className="flex items-center gap-1 h-4">
            {message.isPending && (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
            {message.isFailed && (
              <button
                onClick={() => onRetry?.(message.tempId!)}
                className="flex items-center gap-1 text-xs text-destructive hover:underline"
              >
                <AlertCircle className="h-3 w-3" />
                Failed - Click to retry
              </button>
            )}
            {!message.isPending && !message.isFailed && (
              <Check className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 