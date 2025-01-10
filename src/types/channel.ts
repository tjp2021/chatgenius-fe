import type { User } from '@/types/user';

export type ChannelType = 'PUBLIC' | 'PRIVATE' | 'DM';

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'PUBLIC' | 'PRIVATE' | 'DM';
  createdAt: string;
  ownerId: string;
  members?: ChannelMember[];
  _count: {
    members: number;
    messages: number;
    lastViewedMessageCount?: number;
  };
}

export interface CreateChannelDto {
  name: string;
  description?: string;
  type: 'PUBLIC' | 'PRIVATE' | 'DM';
}

export interface ChannelMember {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user?: {
    id: string;
    name: string | null;
    email: string;
    imageUrl?: string;
  };
}

export interface ChannelMutationResponse {
  success: boolean;
  channel?: Channel;
  error?: string;
} 