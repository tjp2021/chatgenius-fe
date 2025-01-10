import { default as socketIOClient } from 'socket.io-client';
import { socketLogger } from './socket-logger';
import { /* SocketConfig */ } from '@/types';

// Unused interface
// interface SocketConfig {
//   url: string;
//   path: string;
// }

export const createSocket = (token: string, userId: string) => {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  
  if (!socketUrl) {
    socketLogger.error(new Error('Socket URL not configured'));
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
    multiplex: false,
    forceNew: true
  });

  socket.on('connect', () => socketLogger.info('Socket connected'));
  socket.on('disconnect', (reason) => socketLogger.warn(`Socket disconnected: ${reason}`));
  socket.on('error', (error) => socketLogger.error(error));
  socket.on('reconnect_attempt', (attempt) => socketLogger.info(`Reconnection attempt ${attempt}`));

  return socket;
}; 