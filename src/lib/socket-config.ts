import { default as socketIOClient } from 'socket.io-client';

interface SocketConfig {
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

export const createSocket = (token: string, userId: string) => {
  if (!process.env.NEXT_PUBLIC_SOCKET_URL) {
    throw new Error('Socket URL not configured');
  }

  return socketIOClient(process.env.NEXT_PUBLIC_SOCKET_URL, {
    path: '/socket.io/',
    auth: {
      token,
      userId
    },
    transports: ['websocket'],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    timeout: 10000,
    // Prevent multiple socket connections
    multiplex: false,
    // Force a new connection
    forceNew: true
  });
}; 