'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import type { Message } from '@/types/message';
import { MessageReactions } from './message-reactions';
import { MessageSquare } from 'lucide-react';
import { useThread } from '@/hooks/use-thread';
import { Button } from '../ui/button';

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const { userId } = useAuth();
  const { createThread } = useThread();
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const isOwn = message.userId === userId;

  const handleCreateThread = async () => {
    try {
      setIsCreatingThread(true);
      await createThread(message.id);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to create thread:', error);
    } finally {
      setIsCreatingThread(false);
    }
  };

  return (
    <div className={cn(
      "flex gap-2 p-4",
      isOwn ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex flex-col",
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

        {/* Actions row */}
        <div className="flex items-center gap-2 mt-1">
          {/* Message reactions */}
          {userId && (
            <MessageReactions
              message={message}
              currentUserId={userId}
            />
          )}

          {/* Thread button */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "flex items-center gap-1 text-xs",
              message.hasThread && "text-blue-500"
            )}
            onClick={handleCreateThread}
            disabled={isCreatingThread || message.hasThread}
          >
            <MessageSquare className="h-4 w-4" />
            {isCreatingThread ? 'Creating...' : (
              <>
                {message.hasThread ? (
                  <div className="flex items-center gap-2">
                    <span>View thread</span>
                    {message.threadParticipantCount && message.threadParticipantCount > 0 && (
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
                        {message.threadParticipantCount} {message.threadParticipantCount === 1 ? 'reply' : 'replies'}
                      </span>
                    )}
                  </div>
                ) : (
                  'Start thread'
                )}
              </>
            )}
          </Button>

          {/* Success message */}
          {showSuccess && (
            <span className="text-xs text-green-500">
              Thread created!
            </span>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-500 mt-1">
          {message.createdAt ? (
            <>
              {new Date(message.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
              {' '}
              {new Date(message.createdAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
              })}
            </>
          ) : 'No date available'}
        </span>
      </div>
    </div>
  );
} 