import { io, Socket } from 'socket.io-client';
import { /* Message, */ MessageEvent } from '@/types/message';
import { socketLogger } from './socket-logger';

interface SocketConfig {
  url: string;
  token: string;
  userId: string;
  onAuthError?: (error: Error) => void;
  onConnectionError?: (error: Error) => void;
  onReconnect?: () => void;
  onDisconnect?: (reason: string) => void;
  timeout?: number;
  reconnectOptions?: {
    maxAttempts: number;
    interval: number;
  };
}

interface SocketResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SocketErrorResponse {
  code: string;
  message: string;
}

interface SocketDisconnectResponse {
  reason: string;
  wasClean: boolean;
}

interface SocketReconnectResponse {
  attempt: number;
  delay: number;
}

export class ChatSocketClient {
  private socket!: Socket;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS: number;
  private readonly RECONNECT_DELAY: number;
  private readonly CONNECTION_TIMEOUT: number;

  public isConnected = false;
  public auth = { userId: '', token: '' };

  constructor(private config: SocketConfig) {
    this.MAX_RECONNECT_ATTEMPTS = config.reconnectOptions?.maxAttempts || 5;
    this.RECONNECT_DELAY = config.reconnectOptions?.interval || 5000;
    this.CONNECTION_TIMEOUT = config.timeout || 10000;

    this.auth = {
      userId: config.userId,
      token: config.token
    };
    this.initializeSocket();
  }

  private initializeSocket() {
    let socketUrl: URL;
    try {
      socketUrl = new URL(this.config.url);
    } catch (error) {
      throw new Error(`Invalid socket URL: ${this.config.url}`);
    }
    
    socketLogger.debug('Initializing connection to:', socketUrl.toString());
    
    // Clean up token format
    const token = this.config.token.replace('Bearer ', '');
    
    this.socket = io(socketUrl.toString(), {
      auth: {
        token,
        userId: this.config.userId
      },
      reconnection: true,
      reconnectionDelay: this.RECONNECT_DELAY,
      reconnectionAttempts: this.MAX_RECONNECT_ATTEMPTS,
      transports: ['websocket', 'polling'],
      timeout: this.CONNECTION_TIMEOUT,
      path: '/socket.io'
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.socket.on('connect', () => {
      socketLogger.connect(this.socket.id);
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      socketLogger.disconnect(reason);
      this.isConnected = false;
      this.config.onDisconnect?.(reason);
    });

    this.socket.on('connect_error', (error) => {
      socketLogger.error(error, { socketId: this.socket.id });
      this.isConnected = false;
      
      if (error.message.includes('Authentication failed')) {
        this.config.onAuthError?.(error);
      } else {
        this.config.onConnectionError?.(error);
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      socketLogger.debug(`Reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
      this.isConnected = true;
      this.config.onReconnect?.();
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      socketLogger.debug(`Reconnection attempt ${attemptNumber}`);
      // Update auth on reconnect attempt with clean token
      const token = this.config.token.replace('Bearer ', '');
      this.socket.auth = {
        token,
        userId: this.config.userId
      };
    });

    this.socket.on('reconnect_error', (error) => {
      socketLogger.error(error, { 
        socketId: this.socket.id,
        attempt: this.reconnectAttempts + 1
      });
      this.reconnectAttempts++;
    });

    this.socket.on('reconnect_failed', () => {
      socketLogger.error(new Error('Reconnection failed'), {
        maxAttempts: this.MAX_RECONNECT_ATTEMPTS
      });
    });

    this.socket.on('error', (error: Error) => {
      socketLogger.error(error, { socketId: this.socket.id });
      this.config.onConnectionError?.(error);
    });

    this.socket.on('message:delivered', (/* data */) => {
      // Handle message delivered
    });

    this.socket.on('message:read', (/* data */) => {
      // Handle message read
    });
  }

  public on<T = any>(event: string, callback: (data: T) => void) {
    this.socket.on(event, callback);
  }

  public off<T = any>(event: string, callback: (data: T) => void) {
    this.socket.off(event, callback);
  }

  public emit<T = any>(event: string, data: any): Promise<SocketResponse<T>> {
    return new Promise((resolve) => {
      this.socket.emit(event, data, (response: SocketResponse<T>) => {
        resolve(response);
      });
    });
  }

  async sendMessage<T>(
    channelId: string, 
    content: string,
    tempId?: string
  ): Promise<SocketResponse<T>> {
    return this.emit<T>(MessageEvent.SEND, { 
      channelId, 
      content, 
      tempId 
    });
  }

  async confirmDelivery(messageId: string): Promise<SocketResponse<void>> {
    return this.emit(MessageEvent.DELIVERED, { messageId });
  }

  async markAsRead(messageId: string): Promise<SocketResponse<void>> {
    return this.emit(MessageEvent.READ, { messageId });
  }

  onNewMessage<T>(callback: (message: T) => void) {
    this.socket.on(MessageEvent.NEW, callback);
    return () => this.socket.off(MessageEvent.NEW, callback);
  }

  updateCredentials(token: string, userId: string) {
    socketLogger.debug('Updating credentials');
    this.config.token = token;
    this.config.userId = userId;
    this.auth = { token, userId };
    this.socket.auth = { token, userId };
    this.socket.disconnect().connect();
  }

  disconnect() {
    socketLogger.debug('Disconnecting socket');
    this.socket.disconnect();
  }
}