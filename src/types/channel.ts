import type { User } from '@/types/user';

export type ChannelType = 'PUBLIC' | 'PRIVATE' | 'DM';

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'PUBLIC' | 'PRIVATE' | 'DM';
  createdAt: string;
  _count: {
    members: number;
    messages: number;
  };
}

export interface CreateChannelDto {
  name: string;
  description?: string;
  type: 'PUBLIC' | 'PRIVATE' | 'DM';
}

export interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user: User;
  joinedAt: string;
}

export interface ChannelMutationResponse {
  success: boolean;
  channel?: Channel;
  error?: string;
} 