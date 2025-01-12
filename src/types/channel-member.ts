import { User } from './user';

export interface ChannelMemberData {
  channelId: string;
  members: User[];
  action: 'join' | 'leave';
  userId: string;
} 