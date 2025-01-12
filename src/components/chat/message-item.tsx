'use client';

import { useAuth } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import type { Message } from '@/types/message';
import { MessageReactions } from './message-reactions';

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const { userId } = useAuth();
  const isOwn = message.userId === userId;

  return (
    <div className={cn(
      "flex gap-2 p-4",
      isOwn ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex flex-col max-w-[70%]",
        isOwn ? "items-end" : "items-start"
      )}>
        {/* User name */}
        <span className="text-sm font-medium text-gray-600 mb-1">
          {message.user?.name || 'Unknown User'}
        </span>

        {/* Message content */}
        <div className={cn(
          "px-4 py-2 rounded-lg",
          isOwn 
            ? "bg-blue-500 text-white" 
            : "bg-gray-100 text-gray-900"
        )}>
          {message.content}
        </div>

        {/* Message reactions */}
        {userId && (
          <MessageReactions
            message={message}
            currentUserId={userId}
          />
        )}

        {/* Timestamp */}
        <span className="text-xs text-gray-500 mt-1">
          {new Date(message.createdAt).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
} 