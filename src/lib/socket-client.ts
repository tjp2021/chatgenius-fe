import { io, Socket } from 'socket.io-client';
import { Message } from '@/types/message';
import { SocketResponse } from '@/types/socket';

export interface SocketConfig {
  url: string;
  token: string;    // Raw Clerk JWT token
  userId: string;   // Clerk user ID
  onAuthError?: (error: Error) => void;
  onConnectionError?: (error: Error) => void;
  onReconnect?: () => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface PendingMessage {
  channelId: string;
  content: string;
  tempId: string;
  retryCount: number;
  timestamp: number;
}

export class ChatSocketClient {
  private socket!: Socket;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly INITIAL_RECONNECT_DELAY = 1000;
  private readonly MAX_RECONNECT_DELAY = 5000;
  private pendingMessages = new Map<string, PendingMessage>();
  private isReconnecting = false;
  private connectionState: 'connected' | 'disconnected' | 'connecting' = 'disconnected';

  constructor(private config: SocketConfig) {
    this.initializeSocket();
  }

  private initializeSocket() {
    console.log('[Socket] Initializing with config:', {
      url: this.config.url,
      userId: this.config.userId,
      tokenLength: this.config.token.length,
      reconnection: true,
      reconnectionDelay: this.INITIAL_RECONNECT_DELAY,
      reconnectionAttempts: this.MAX_RECONNECT_ATTEMPTS
    });

    this.connectionState = 'connecting';
    
    this.socket = io(this.config.url, {
      path: '/api/socket.io',
      auth: {
        token: this.config.token,
        userId: this.config.userId
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket']
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.socket.onAny((event, ...args) => {
      console.log(`[Socket Event] ${event}:`, args);
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected successfully');
      this.connectionState = 'connected';
      this.config.onConnect?.();
      this.processPendingMessages();
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('[Socket] Connection error:', {
        message: error.message,
      });
      this.connectionState = 'disconnected';
      if (error.message.includes('Authentication failed')) {
        this.config.onAuthError?.(error);
      } else {
        this.config.onConnectionError?.(error);
      }

      if (!this.isReconnecting) {
        this.handleReconnection();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', {
        reason,
        wasConnected: this.connectionState === 'connected',
        socketId: this.socket.id
      });
      this.connectionState = 'disconnected';
      this.config.onDisconnect?.();
    });

    this.socket.on('channel:joined', (data) => {
      console.log('[Socket] Channel joined:', data);
    });

    this.socket.on('channel:left', (data) => {
      console.log('[Socket] Channel left:', data);
    });

    this.socket.on('channel:error', (error) => {
      console.error('[Socket] Channel error:', error);
    });

    this.socket.on('error', (error) => {
      console.error('[Socket] Error:', error);
    });
  }

  private async handleReconnection() {
    this.isReconnecting = true;
    const delay = Math.min(
      this.INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      this.MAX_RECONNECT_DELAY
    );

    await new Promise(resolve => setTimeout(resolve, delay));

    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      this.socket.connect();
    } else {
      this.isReconnecting = false;
      this.config.onConnectionError?.(new Error('Max reconnection attempts reached'));
    }
  }

  private async processPendingMessages() {
    if (this.connectionState !== 'connected') return;

    for (const [tempId, message] of Array.from(this.pendingMessages.entries())) {
      try {
        const response = await this.sendMessage<Message>(
          message.channelId,
          message.content,
          tempId
        );
        if (response.success) {
          this.pendingMessages.delete(tempId);
        } else if (message.retryCount < this.MAX_RECONNECT_ATTEMPTS) {
          message.retryCount++;
        } else {
          this.pendingMessages.delete(tempId);
          console.error('Failed to send message after max retries:', tempId);
        }
      } catch (error) {
        console.error('Error processing pending message:', error);
      }
    }
  }

  async sendMessage<T>(
    channelId: string, 
    content: string,
    tempId: string = Date.now().toString()
  ): Promise<SocketResponse<T>> {
    console.log('[Socket] Attempting to send message:', { channelId, content, tempId });
    
    if (this.connectionState !== 'connected') {
      console.log('[Socket] Not connected, queueing message');
      this.pendingMessages.set(tempId, {
        channelId,
        content,
        tempId,
        retryCount: 0,
        timestamp: Date.now()
      });
      return { success: false, error: 'Not connected' };
    }

    const response = await this.emit<T>('message:send', { channelId, content, tempId });
    console.log('[Socket] Message send response:', response);
    
    if (!response.success) {
      // Queue message for retry if send failed
      this.pendingMessages.set(tempId, {
        channelId,
        content,
        tempId,
        retryCount: 0,
        timestamp: Date.now()
      });
    }

    return response;
  }

  async confirmDelivery(messageId: string): Promise<SocketResponse<void>> {
    if (this.connectionState !== 'connected') {
      return { success: false, error: 'Not connected' };
    }

    return this.emit<void>('message:delivered', { messageId });
  }

  async markAsRead(messageId: string): Promise<SocketResponse<void>> {
    if (this.connectionState !== 'connected') {
      return { success: false, error: 'Not connected' };
    }

    return this.emit<void>('message:read', { messageId });
  }

  async joinChannel(channelId: string): Promise<SocketResponse<void>> {
    console.log(`[Socket] Attempting to join channel ${channelId}. Connection state:`, this.connectionState);
    
    if (this.connectionState !== 'connected') {
      console.log('[Socket] Cannot join - not connected. State:', this.connectionState);
      return { success: false, error: 'Socket not connected' };
    }

    const payload = { 
      channelId,
      userId: this.config.userId
    };
    console.log('[Socket] Join payload:', payload);
    
    return this.emit<void>('channel:join', payload);
  }

  async leaveChannel(channelId: string): Promise<SocketResponse<void>> {
    if (this.connectionState !== 'connected') {
      return { success: false, error: 'Socket not connected' };
    }

    return this.emit<void>('channel:leave', {
      channelId,
      userId: this.config.userId
    });
  }

  onNewMessage<T>(callback: (message: T) => void) {
    this.socket.on('message:new', callback);
    return () => this.socket.off('message:new', callback);
  }

  on<T>(event: string, callback: (data: T) => void) {
    this.socket.on(event, callback);
    return () => this.socket.off(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket.off(event, callback);
  }

  emit<T>(event: string, data: any): Promise<SocketResponse<T>> {
    if (this.connectionState !== 'connected') {
      return Promise.resolve({ success: false, error: 'Not connected' });
    }

    return new Promise((resolve) => {
      // Set a timeout to handle cases where the server doesn't respond
      const timeoutId = setTimeout(() => {
        resolve({ success: false, error: 'Server did not respond in time' });
      }, 5000);

      this.socket.emit(event, data, (response: SocketResponse<T>) => {
        clearTimeout(timeoutId);
        console.log(`[Socket] Received response for ${event}:`, response);
        resolve(response || { success: false, error: 'No response from server' });
      });
    });
  }

  updateCredentials(token: string, userId: string) {
    this.config.token = token;
    this.config.userId = userId;
    this.socket.auth = { token, userId };
    this.socket.disconnect().connect();
  }

  disconnect() {
    this.pendingMessages.clear();
    this.socket.disconnect();
    this.connectionState = 'disconnected';
  }

  public get connected(): boolean {
    return this.connectionState === 'connected';
  }

  public get connecting(): boolean {
    return this.connectionState === 'connecting';
  }
}