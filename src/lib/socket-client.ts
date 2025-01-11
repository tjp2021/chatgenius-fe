import { io, Socket } from 'socket.io-client';
import { Message } from '@/types/message';

export interface SocketResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SocketErrorResponse {
  code: string;
  message: string;
}

export interface SocketDisconnectResponse {
  reason: string;
}

export interface SocketReconnectResponse {
  attempt: number;
}

export interface SocketAuth {
  userId: string;
  username: string;
  token: string;
}

export interface SocketEventData {
  channelId: string;
  content?: string;
  tempId?: string;
  userId?: string;
  messageId?: string;
}

export class SocketClient {
  private socket: Socket;
  public auth: SocketAuth | null = null;

  constructor(url: string) {
    this.socket = io(url, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventHandlers();
  }

  public get connected(): boolean {
    return this.socket.connected;
  }

  public connect(auth: SocketAuth) {
    this.auth = auth;
    this.socket.auth = auth;
    this.socket.connect();
  }

  public disconnect() {
    this.socket.disconnect();
  }

  private setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('message:delivered', (/* data */) => {
      // Handle message delivered
    });

    this.socket.on('message:read', (/* data */) => {
      // Handle message read
    });
  }

  public on<T>(event: string, callback: (data: T) => void) {
    this.socket.on(event, callback);
  }

  public off<T>(event: string, callback: (data: T) => void) {
    this.socket.off(event, callback);
  }

  public emit<T>(event: string, data: SocketEventData): Promise<SocketResponse<T>> {
    return new Promise((resolve) => {
      this.socket.emit(event, data, (response: SocketResponse<T>) => {
        resolve(response);
      });
    });
  }

  async sendMessage(
    channelId: string, 
    content: string,
    tempId?: string
  ): Promise<SocketResponse<Message>> {
    return this.emit('message:send', {
      channelId,
      content,
      tempId
    });
  }
}