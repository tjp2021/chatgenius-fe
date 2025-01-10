import { io, Socket } from 'socket.io-client';
import { Message, MessageEvent } from '@/types/message';

interface SocketConfig {
  url: string;
  token: string;
  userId: string;
  onAuthError?: (error: Error) => void;
  onConnectionError?: (error: Error) => void;
  onReconnect?: () => void;
}

interface SocketResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ChatSocketClient {
  private socket!: Socket;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 1000;

  public isConnected = false;
  public auth = { userId: '', token: '' };

  constructor(private config: SocketConfig) {
    this.auth = {
      userId: config.userId,
      token: config.token
    };
    this.initializeSocket();
  }

  private initializeSocket() {
    this.socket = io(this.config.url, {
      auth: {
        token: this.config.token,
        userId: this.config.userId
      },
      reconnection: true,
      reconnectionDelay: this.RECONNECT_DELAY,
      reconnectionAttempts: this.MAX_RECONNECT_ATTEMPTS
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.socket.on('connect', () => {
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      this.isConnected = false;
      if (error.message.includes('Authentication failed')) {
        this.config.onAuthError?.(error);
      } else {
        this.config.onConnectionError?.(error);
      }
    });

    this.socket.on('reconnect', () => {
      this.reconnectAttempts = 0;
      this.isConnected = true;
      this.config.onReconnect?.();
    });
  }

  // Socket event methods
  public on<T = any>(event: string, callback: (data: T) => void) {
    this.socket.on(event, callback);
  }

  public off<T = any>(event: string, callback: (data: T) => void) {
    this.socket.off(event, callback);
  }

  public emit<T = any>(event: string, data: any, callback?: (response: T) => void) {
    if (callback) {
      this.socket.emit(event, data, callback);
    } else {
      this.socket.emit(event, data);
    }
  }

  // Message methods
  async sendMessage<T>(
    channelId: string, 
    content: string,
    tempId?: string
  ): Promise<SocketResponse<T>> {
    return new Promise((resolve) => {
      this.socket.emit(MessageEvent.SEND, 
        { channelId, content, tempId },
        (response: SocketResponse<T>) => {
          resolve(response);
        }
      );
    });
  }

  async confirmDelivery(messageId: string): Promise<SocketResponse<void>> {
    return new Promise((resolve) => {
      this.socket.emit(MessageEvent.DELIVERED, 
        { messageId },
        (response: SocketResponse<void>) => {
          resolve(response);
        }
      );
    });
  }

  async markAsRead(messageId: string): Promise<SocketResponse<void>> {
    return new Promise((resolve) => {
      this.socket.emit(MessageEvent.READ, 
        { messageId },
        (response: SocketResponse<void>) => {
          resolve(response);
        }
      );
    });
  }

  onNewMessage<T>(callback: (message: T) => void) {
    this.socket.on(MessageEvent.NEW, callback);
    return () => this.socket.off(MessageEvent.NEW, callback);
  }

  updateCredentials(token: string, userId: string) {
    this.config.token = token;
    this.config.userId = userId;
    this.auth = { token, userId };
    this.socket.auth = { token, userId };
    this.socket.disconnect().connect();
  }

  disconnect() {
    this.socket.disconnect();
  }
} 