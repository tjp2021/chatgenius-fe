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
  _count: {
    members: number;
    messages: number;
    lastViewedMessageCount?: number;
  };
  isMember: boolean;
  joinedAt: string | null;
  isOwner?: boolean;
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

export interface ChannelGroups {
  public: Channel[];
  private: Channel[];
  dms: Channel[];
}

export interface OnlineUsers {
  [userId: string]: boolean;
}

export interface ChannelActionsDropdownProps {
  isMember: boolean;
  onJoin: () => void;
  onLeave: () => void;
}

export interface NavigationState {
  channels: Channel[];
}

export interface NavigationResponse {
  navigationState: NavigationState;
}

export interface TransitionResult {
  success: boolean;
}

export interface TransitionResponse {
  transitionResult: TransitionResult;
} 