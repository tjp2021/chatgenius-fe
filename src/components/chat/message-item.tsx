'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useUser } from '@clerk/nextjs';
import { useApi } from '@/hooks/useApi';
import type { Message } from '@/types/message';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/ui/icons';

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
}

export function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const { updateMessage } = useApi();
  const { user } = useUser();

  const handleEdit = async () => {
    try {
      await updateMessage(message.id, editedContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update message:', error);
    }
  };

  const messageTime = format(new Date(message.createdAt), 'HH:mm');
  const isEdited = message.updatedAt > message.createdAt;

  return (
    <div
      className={cn(
        'group flex w-full gap-2',
        isOwnMessage ? 'justify-end' : 'justify-start'
      )}
    >
      {!isOwnMessage && (
        <div className="h-8 w-8 rounded-full bg-gray-200">
          <img
            src={message.user.imageUrl || '/default-avatar.png'}
            alt={message.user.username || 'User'}
            className="h-full w-full rounded-full object-cover"
          />
        </div>
      )}
      <div
        className={cn(
          'flex max-w-[70%] flex-col gap-1',
          isOwnMessage ? 'items-end' : 'items-start'
        )}
      >
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {!isOwnMessage && <span>{message.user.username}</span>}
          <span>{messageTime}</span>
          {isEdited && <span>(edited)</span>}
        </div>
        {isEditing ? (
          <div className="w-full space-y-2">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[60px] w-full resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleEdit}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'relative rounded-lg px-3 py-2',
              isOwnMessage
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {message.content}
            {isOwnMessage && (
              <div className="absolute -right-8 top-1/2 hidden -translate-y-1/2 group-hover:flex">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                >
                  <Icons.edit className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
        {message.deliveryStatus && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {message.deliveryStatus === 'SENDING' && (
              <>
                <Icons.clock className="h-3 w-3" />
                <span>Sending...</span>
              </>
            )}
            {message.deliveryStatus === 'SENT' && (
              <>
                <Icons.check className="h-3 w-3" />
                <span>Sent</span>
              </>
            )}
            {message.deliveryStatus === 'DELIVERED' && (
              <>
                <Icons.checkCheck className="h-3 w-3" />
                <span>Delivered</span>
              </>
            )}
            {message.deliveryStatus === 'READ' && (
              <>
                <Icons.checkCheck className="h-3 w-3 text-blue-500" />
                <span className="text-blue-500">Read</span>
              </>
            )}
            {message.deliveryStatus === 'FAILED' && (
              <>
                <Icons.alertCircle className="h-3 w-3 text-red-500" />
                <span className="text-red-500">Failed to send</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 