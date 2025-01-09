import { SocketConfig } from '@/types/socket';

export const createSocketConfig = (token: string, userId: string): SocketConfig => ({
  url: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
  path: '/socket.io',
  auth: { 
    token: `Bearer ${token}`,
    userId 
  },
  options: {
    transports: ['websocket', 'polling'],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    timeout: 20000,
    forceNew: true
  }
}); 