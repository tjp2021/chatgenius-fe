import { Server as ServerIO } from 'socket.io';
import { Server as NetServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { Socket } from 'net';

interface SocketServer extends Socket {
  server: NetServer & {
    io?: ServerIO;
  };
}

interface SocketWithIO extends NextApiResponse {
  socket: SocketServer;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

const ioHandler = (req: NextApiRequest, res: SocketWithIO) => {
  console.log('Socket handler called:', req.url);
  
  if (!res.socket.server.io) {
    console.log('Initializing socket server');
    const io = new ServerIO(res.socket.server, {
      path: '/api/socket/io',
      addTrailingSlash: false,
    });
    
    res.socket.server.io = io;
  }

  res.end();
};

export default ioHandler;