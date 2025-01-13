import { Message } from './message';

export interface Thread {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  channelId: string;
  _count?: {
    replies: number;
  };
  user?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  lastReply?: Message;
  parentMessage?: {
    id: string;
    content: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      imageUrl?: string;
    };
  };
}

export interface ThreadReply extends Message {
  replyToId: string;
}

export interface ThreadEventPayload {
  threadId: string;
  channelId: string;
  userId?: string;
  timestamp?: number;
}

export interface ThreadReplyEventPayload {
  messageId: string;
  threadId: string;
  tempId: string;
  status: 'DELIVERED' | 'FAILED';
  processed: boolean;
  error?: string;
}

export interface ThreadReplyCreatedPayload {
  message: Message;
  threadId: string;
  tempId?: string;
  processed: boolean;
}

export interface ThreadUpdatedPayload {
  threadId: string;
  replyCount: number;
  lastReply: Message;
  processed: boolean;
} 