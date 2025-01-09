import type { Socket as ClientSocket } from 'socket.io-client';

export interface SocketConfig {
  url: string;
  path: string;
  auth: {
    token: string;
    userId: string;
  };
  options: {
    transports: string[];
    autoConnect: boolean;
    reconnection: boolean;
    reconnectionAttempts: number;
    reconnectionDelay: number;
    timeout: number;
  };
}

export interface SocketState {
  isConnected: boolean;
  isAuthReady: boolean;
  error: Error | null;
}

export interface SocketContextType {
  socket: ClientSocket | null;
  isConnected: boolean;
  isAuthReady: boolean;
} 