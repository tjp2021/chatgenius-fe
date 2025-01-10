export interface Message {
  id?: string;
  tempId?: string;
  content: string;
  userId: string;
  channelId: string;
  createdAt: string;
  isPending?: boolean;
  isFailed?: boolean;
  parentId?: string; // For threading
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  messageId: string;
}

export interface MessageThread {
  id: string;
  messageId: string;
  replies: Message[];
}

export enum MessageEvent {
  /* SEND = 'message:send',
  NEW = 'message:new',
  DELIVERED = 'message:delivered',
  FAILED = 'message:failed',
  TYPING_START = 'typing:start',
  TYPING_STOP = 'typing:stop' */
}

export interface TypingIndicator {
  userId: string;
  username: string;
  channelId: string;
} 