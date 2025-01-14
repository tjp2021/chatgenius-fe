import { NextApiResponse } from 'next';
import { Server as NetServer } from 'http';
import { Server as ServerIO } from 'socket.io';
import { Socket } from 'net';

export interface SocketServer extends Socket {
  server: NetServer & {
    io?: ServerIO;
  };
}

export interface NextApiResponseServerIO extends NextApiResponse {
  socket: SocketServer;
} 