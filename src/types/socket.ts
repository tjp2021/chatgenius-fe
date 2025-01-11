import { Socket } from 'socket.io-client';
import { Message } from './message';

export interface SocketResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CustomSocket extends Socket {
  auth: {
    userId: string;
  };
  isConnected: boolean;
  sendMessage: (channelId: string, content: string, tempId: string) => Promise<SocketResponse<Message>>;
}

export interface SocketErrorResponse {
  message: string;
  code: string;
}

export interface SocketDisconnectResponse {
  reason: string;
}

export interface SocketReconnectResponse {
  attempt: number;
} 