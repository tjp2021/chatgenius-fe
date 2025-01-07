export enum ChannelType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  DM = 'DM'
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description?: string;
  _count?: {
    members: number;
    messages: number;
  };
  members?: ChannelMember[];
  isMember?: boolean;
  createdAt: string;
}

export interface ChannelMember {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user: {
    id: string;
    name: string;
    imageUrl: string;
  };
} 