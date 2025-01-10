import type { User } from '@/types/user';

export type MessageDeliveryStatus = 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface Message {
  id: string;
  content: string;
  channelId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  deliveryStatus: MessageDeliveryStatus;
  user: User;
  parentId?: string;
}

export interface MessageResponse {
  success: boolean;
  data?: Message;
  error?: string;
} 