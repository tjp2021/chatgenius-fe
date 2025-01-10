import type { User } from '@/types/user';

export const MessageDeliveryStatus = {
  SENDING: 'SENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED'
} as const;

export type MessageDeliveryStatusType = typeof MessageDeliveryStatus[keyof typeof MessageDeliveryStatus];

export interface ReadReceipt {
  userId: string;
  readAt: string;
}

export interface Message {
  id?: string;
  tempId?: string;
  content: string;
  channelId: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  deliveryStatus: MessageDeliveryStatusType;
  user?: User;
  parentId?: string;
  readBy?: ReadReceipt[];
  error?: string;
}

export interface MessagePayload {
  content: string;
  channelId: string;
  userId: string;
  tempId: string;
  parentId?: string;
}

export enum MessageEvent {
  SEND = 'message:send',
  SENT = 'message:sent',
  NEW = 'message:new',
  DELIVERED = 'message:delivered',
  READ = 'message:read',
  TYPING_START = 'message:typing:start',
  TYPING_STOP = 'message:typing:stop'
}

export interface MessageResponse {
  success: boolean;
  data?: Message;
  error?: string;
}

export interface MessageDeliveredPayload {
  messageId: string;
  channelId: string;
}

export interface MessageReadPayload {
  messageId: string;
  channelId: string;
  readAt: string;
} 