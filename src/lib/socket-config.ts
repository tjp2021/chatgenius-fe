import { default as socketIOClient } from 'socket.io-client';
import { logger } from '../utils/logger';

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
    connectTimeout: number;
  };
}

export const createSocket = (token: string, userId: string) => {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  
  if (!socketUrl) {
    logger.error('Socket URL not configured');
    throw new Error('Socket URL not configured');
  }

  const url = socketUrl.startsWith('http') ? socketUrl : `https://${socketUrl}`;

  const socket = socketIOClient(url, {
    path: '/socket.io/',
    auth: {
      token,
      userId
    },
    transports: ['websocket', 'polling'],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
    timeout: 20000,
    connectTimeout: 15000,
    multiplex: false,
    forceNew: true
  });

  socket.on('connect', () => logger.info('Socket connected'));
  socket.on('disconnect', (reason) => logger.warn(`Socket disconnected: ${reason}`));
  socket.on('error', (error) => logger.error('Socket error:', error));
  socket.on('reconnect_attempt', (attempt) => logger.info(`Reconnection attempt ${attempt}`));

  return socket;
}; 