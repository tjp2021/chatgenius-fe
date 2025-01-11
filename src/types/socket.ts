import { Socket } from 'socket.io-client';

export interface SocketConfig {
  url: string;
  token: string;
  userId: string;
  onAuthError: (error: Error) => void;
  onConnectionError: (error: Error) => void;
  onReconnect: () => void;
}

export interface SocketResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SocketErrorResponse {
  code: string;
  message: string;
}

export interface SocketDisconnectResponse {
  reason: string;
  wasClean: boolean;
}

export interface SocketReconnectResponse {
  attempt: number;
  success: boolean;
}

export interface MessagePayload {
  channelId: string;
  content: string;
}

export interface MessageReadPayload {
  messageId: string;
  channelId: string;
}

export interface SocketEvents {
  'message:send': (payload: MessagePayload) => void;
  'message:delivered': (messageId: string) => void;
  'message:read': (payload: MessageReadPayload) => void;
  'message:new': (message: any) => void;
  'channel:join': (channelId: string) => void;
  'channel:leave': (channelId: string) => void;
  'error': (error: SocketErrorResponse) => void;
  'disconnect': (response: SocketDisconnectResponse) => void;
  'reconnect': (response: SocketReconnectResponse) => void;
}

export type SocketEventName = keyof SocketEvents;
export type SocketEventHandler<T extends SocketEventName> = SocketEvents[T]; 