export enum MessageEvent {
  // Sending/receiving messages
  SEND = 'message:send',
  NEW = 'message:new',
  SENT = 'message:sent',
  
  // Typing indicators
  TYPING_START = 'message:typing:start',
  TYPING_STOP = 'message:typing:stop',
  
  // Delivery status
  DELIVERED = 'message:delivered',
  READ = 'message:read',
  
  // Error events
  ERROR = 'message:error'
}

export enum MessageDeliveryStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

export interface MessagePayload {
  content: string;
  channelId: string;
  parentId?: string;
  deliveryStatus?: MessageDeliveryStatus;
}

export interface MessageResponse {
  messageId: string;
  channelId: string;
  status: MessageDeliveryStatus;
}

export interface Message {
  id: string;
  content: string;
  userId: string;
  userName: string;
  channelId: string;
  createdAt: string;
}

export interface TypingIndicator {
  userId: string;
  channelId: string;
  isTyping: boolean;
}

export interface DeliveryStatusUpdate {
  messageId: string;
  channelId: string;
  status: MessageDeliveryStatus;
} 