import { /* User */ } from './user';

export enum ChannelType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  DM = 'DM'
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: ChannelType;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  isJoined: boolean;
  _count: {
    messages: number;
    members: number;
  };
  members?: Array<{
    userId: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
    user: {
      id: string;
      name: string;
      imageUrl: string | null;
    };
  }>;
}

export interface CreateChannelDto {
  name: string;
  description?: string;
  type: 'PUBLIC' | 'PRIVATE' | 'DM';
}

export interface ChannelMember {
  userId: string;
  channelId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
  lastReadAt: string;
  user?: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
}

export interface ChannelResponse {
  success: boolean;
  data?: Channel;
  error?: string;
}

export interface ChannelListResponse {
  channels: Channel[];
}

export interface ChannelMutationResponse {
  success: boolean;
  channel?: Channel;
  error?: string;
}

export interface ChannelLeaveResponse {
  success: boolean;
  wasDeleted: boolean;
  error?: string;
}

export interface OnlineUsers {
  [userId: string]: boolean;
}

export interface ChannelGroups {
  public: Channel[];
  private: Channel[];
  dms: Channel[];
} 