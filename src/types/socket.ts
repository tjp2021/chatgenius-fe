import { Socket as ClientSocket } from 'socket.io-client';

interface SocketAuth {
  userId: string;
  userName: string;
}

export interface CustomSocket extends ClientSocket {
  auth?: SocketAuth;
} 