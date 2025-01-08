import { User } from '@clerk/nextjs/server';

export enum ChannelType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  DM = 'DM'
}

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: ChannelType;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  _count?: {
    members: number;
    messages: number;
  };
  isMember?: boolean;
  joinedAt?: string;
  members?: ChannelMember[];
}

export interface ChannelMember {
  userId: string;
  channelId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user?: {
    id: string;
    name: string | null;
    imageUrl: string | null;
  };
}

export interface ChannelWithDetails extends Channel {
  _count: {
    members: number;
    messages: number;
  };
  members: ChannelMember[];
  isMember: boolean;
}

export interface ChannelGroups {
  public: ChannelWithDetails[];
  private: ChannelWithDetails[];
  dms: ChannelWithDetails[];
}

export interface OnlineUsers {
  [userId: string]: boolean;
}

export interface ChannelActionsDropdownProps {
  isMember: boolean;
  onJoin: () => void;
  onLeave: () => void;
} 