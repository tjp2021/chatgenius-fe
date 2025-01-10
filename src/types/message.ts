export interface Message {
  id?: string;
  tempId?: string;
  content: string;
  userId: string;
  channelId: string;
  createdAt: string;
  isPending?: boolean;
  isFailed?: boolean;
}

export enum MessageEvent {
  SEND = 'message:send',
  NEW = 'message:new',
  DELIVERED = 'message:delivered',
  FAILED = 'message:failed'
}

export enum MessageDeliveryStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed'
} 