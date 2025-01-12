export enum MessageEvent {
  NEW = 'NEW',
  SEND = 'SEND',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  TYPING_START = 'TYPING_START',
  TYPING_STOP = 'TYPING_STOP'
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
  isRead: boolean;
  isDelivered: boolean;
  user: {
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

export interface MessageReadReceipt {
  messageId: string;
  userId: string;
  channelId: string;
  readAt: string;
  user?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
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

export interface TypingIndicator {
  userId: string;
  username: string;
  channelId: string;
  timestamp: number;
} 