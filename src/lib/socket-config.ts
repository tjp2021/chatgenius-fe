import { default as socketIOClient } from 'socket.io-client';
import { SocketLogger } from './socket-logger';

const logger = new SocketLogger('Socket');

export const socketConfig = {
  client: socketIOClient,
  logger,
  options: {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  }
}; 