import { User } from './user';
import { Message } from './message';

export interface Reaction {
  id: string;
  emoji: string;
  messageId: string;
  userId: string;
  user: User;
  createdAt: Date;
}

export enum MessageEvent {
  REACTION_ADDED = 'message:reaction:added',
  REACTION_REMOVED = 'message:reaction:removed'
} 