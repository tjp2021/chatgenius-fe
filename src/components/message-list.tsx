'use client';

import { Message } from '@prisma/client';
import { useUser } from '@clerk/nextjs';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface MessageWithUser extends Message {
  user: {
    id: string;
    name: string;
    imageUrl: string;
  };
}

interface MessageListProps {
  messages: MessageWithUser[];
}

export function MessageList({ messages }: MessageListProps) {
  const { user: currentUser } = useUser();

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No messages yet. Start the conversation!
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'flex gap-3 items-start',
            message.user.id === currentUser?.id && 'flex-row-reverse'
          )}
        >
          <img
            src={message.user.imageUrl}
            alt={message.user.name}
            className="w-8 h-8 rounded-full"
          />
          <div
            className={cn(
              'flex flex-col',
              message.user.id === currentUser?.id && 'items-end'
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {message.user.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(message.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <div
              className={cn(
                'mt-1 rounded-lg px-3 py-2 text-sm',
                message.user.id === currentUser?.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              {message.content}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 