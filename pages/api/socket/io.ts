import { Server as NetServer } from 'http';
import { NextApiRequest } from 'next';
import { Server as ServerIO } from 'socket.io';
import { NextApiResponseServerIO } from '@/types/next';

export const config = {
  api: {
    bodyParser: false,
  },
};
/* DO NOT TOUCH THE SOCKET PATH THE CORRECT PATH is /socket.io NOT api/socket.io AGAIN DO NOT TOUCH THE CORRECT PATH WHICH IS /socket.io */
const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    const httpServer: NetServer = res.socket.server as any;
    const io = new ServerIO(httpServer, {
      path: '/socket.io',
      addTrailingSlash: false,
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:3002'],
        credentials: true,
      },
    });

    // Handle connection authentication
    io.use((socket, next) => {
      const { userId, token } = socket.handshake.auth;
      if (!userId || !token) {
        return next(new Error('Authentication error: Missing credentials'));
      }

      // Extract token without Bearer prefix if present
      const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      
      // Attach auth data to socket instance
      socket.data = { userId, token: actualToken };
      next();
    });

    res.socket.server.io = io;
  }

  res.end();
};

export default ioHandler;