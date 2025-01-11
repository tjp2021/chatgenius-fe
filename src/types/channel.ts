import { /* User */ } from './user';

export enum ChannelType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  DM = 'DM'
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  ownerId: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    members: number;
    messages: number;
  };
  members?: ChannelMember[];
}

export interface CreateChannelDto {
  name: string;
  description?: string;
  type: 'PUBLIC' | 'PRIVATE' | 'DM';
}

export interface ChannelMember {
  userId: string;
  channelId: string;
  role: string;
  joinedAt: string;
  user?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

export interface ChannelResponse {
  success: boolean;
  data?: Channel;
  error?: string;
}

export interface ChannelListResponse {
  success: boolean;
  data?: Channel[];
  error?: string;
}

export interface ChannelMutationResponse {
  success: boolean;
  channel?: Channel;
  error?: string;
}

export interface ChannelLeaveResponse {
  success: boolean;
  error?: string;
}

export interface ChannelWithDetails extends Channel {
  _count: {
    members: number;
    messages: number;
  };
  members: ChannelMember[];
  isMember?: boolean;
}

export interface OnlineUsers {
  [userId: string]: boolean;
}

export interface ChannelGroups {
  public: Channel[];
  private: Channel[];
  dms: Channel[];
} 