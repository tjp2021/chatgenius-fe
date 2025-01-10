import type { User } from '@/types/user';

export type ChannelType = 'PUBLIC' | 'PRIVATE' | 'DM';

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    members: number;
    messages: number;
    lastViewedMessageCount?: number;
  };
  members?: ChannelMember[];
}

export interface CreateChannelDto {
  name: string;
  type: ChannelType;
  description?: string;
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