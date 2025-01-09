'use client';

import { Message } from '@/types/message';
import { UserAvatar } from './user-avatar';
import { format } from 'date-fns';

interface MessageItemProps {
  message: Message;
}

export const MessageItem = ({ message }: MessageItemProps) => {
  return (
    <div className="flex items-start gap-3">
      <UserAvatar userId={message.userId} />
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{message.userName}</span>
          <span className="text-xs text-gray-500">
            {format(new Date(message.createdAt), 'p')}
          </span>
        </div>
        <p className="text-sm">{message.content}</p>
      </div>
    </div>
  );
}; 