import { Message } from './message';
import { User } from './user';

export interface BaseSocketResponse {
  success: boolean;
  error?: string;
}

export interface MessageSocketResponse extends BaseSocketResponse {
  message?: Message;
}

export interface ChannelSocketResponse extends BaseSocketResponse {
  channelId: string;
  members?: User[];
}

export type SocketResponse = MessageSocketResponse | ChannelSocketResponse;

export interface SocketEvent<T = any> {
  type: string;
  payload: T;
  timestamp: number;
}

export interface SocketError {
  code: string;
  message: string;
  details?: any;
} 