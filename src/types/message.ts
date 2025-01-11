import type { User } from '@/types/user';

export enum MessageEvent {
  NEW = 'NEW',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ'
}

export enum MessageDeliveryStatus {
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

export interface MessageUser {
  id: string;
  name: string;
  username?: string;
  imageUrl?: string;
}

export interface Message {
  id: string;
  content: string;
  channelId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  status: MessageEvent;
  user?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

export interface MessagePayload {
  content: string;
  channelId: string;
  userId: string;
  tempId: string;
  parentId?: string;
}

export interface ReadReceipt {
  messageId: string;
  userId: string;
  channelId: string;
  readAt: string;
}

export interface MessageResponse {
  success: boolean;
  data?: Message;
  error?: string;
}

export interface MessageListResponse {
  success: boolean;
  data?: Message[];
  error?: string;
}

export interface MessageMutationResponse {
  success: boolean;
  message?: Message;
  error?: string;
} 