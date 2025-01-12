import { io, Socket } from 'socket.io-client';
import { Message } from '@/types/message';
import { SocketResponse } from '@/types/socket';
import { User } from '@/types/user';

// Event name constants
const SOCKET_EVENTS = {
  MESSAGE: {
    NEW: 'message:new',
    RECEIVED: 'message:received',
    SEND: 'message:send',
    CONFIRM: 'message:confirm'
  },
  CHANNEL: {
    JOIN: 'channel:join',
    JOINED: 'channel:joined',
    LEAVE: 'channel:leave',
    LEFT: 'channel:left',
    ERROR: 'channel:error'
  },
  ROOM: {
    MEMBER_JOINED: 'room:member:joined',
    MEMBER_LEFT: 'room:member:left',
    ACTIVITY: 'room:activity'
  }
} as const;

// Event payload types
interface RoomEventPayload {
  channelId: string;
  userId: string;
  user?: User;
  timestamp: string;
  memberCount?: number;
  lastActivity?: string;
  activeMembers?: User[];
}

interface ChannelEventPayload {
  channelId: string;
  userId?: string;
  timestamp?: number;
}

interface MessageEventPayload<T = Message> {
  message: T;
  channelId: string;
  timestamp: number;
}

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
  private processedMessageIds = new Set<string>();

  constructor(private config: SocketConfig) {
    this.initializeSocket();
  }

  private initializeSocket() {
    if (!this.config.url) {
      throw new Error('Socket URL is required');
    }

    if (!this.config.token) {
      throw new Error('Authentication token is required');
    }

    if (!this.config.userId) {
      throw new Error('User ID is required');
    }

    console.log('[Socket] Initializing with config:', {
      url: this.config.url,
      userId: this.config.userId,
      hasToken: !!this.config.token,
      reconnection: true,
      reconnectionDelay: this.INITIAL_RECONNECT_DELAY,
      reconnectionAttempts: this.MAX_RECONNECT_ATTEMPTS
    });

    this.connectionState = 'connecting';
    
    try {
      this.socket = io(this.config.url, {
        path: '/api/socket.io',
        auth: {
          token: this.config.token,
          userId: this.config.userId
        },
        reconnection: true,
        reconnectionDelay: this.INITIAL_RECONNECT_DELAY,
        reconnectionAttempts: this.MAX_RECONNECT_ATTEMPTS,
        transports: ['websocket', 'polling'],
        forceNew: true,
        timeout: 10000,
        autoConnect: false
      });

      // Set up event handlers before connecting
      this.setupEventHandlers();

      // Now connect
      this.socket.connect();
    } catch (error) {
      console.error('[Socket] Failed to initialize socket:', error);
      throw error;
    }
  }

  private setupEventHandlers() {
    // Debug logging for all events
    this.socket.onAny((event, ...args) => {
      console.log(`[Socket Event] ${event}:`, args);
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('[Socket] Connected successfully');
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.config.onConnect?.();
      this.processPendingMessages();
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('[Socket] Connection error:', {
        message: error.message,
        stack: error.stack
      });
      
      this.connectionState = 'disconnected';
      
      if (error.message.includes('Authentication')) {
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
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, attempt to reconnect
        this.socket.connect();
      }
    });

    // Transport events
    this.socket.io.on("error", (error) => {
      console.error("[Socket.IO] Transport error:", error);
    });

    this.socket.io.on("reconnect_attempt", (attempt) => {
      console.log("[Socket.IO] Reconnection attempt:", attempt);
    });

    this.socket.io.on("reconnect", () => {
      console.log("[Socket.IO] Reconnected successfully");
      this.config.onReconnect?.();
    });

    // Auth events
    this.socket.on('unauthorized', (error) => {
      console.error('[Socket] Authentication failed:', error);
      this.config.onAuthError?.(new Error('Authentication failed'));
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

    return this.emit<T>(SOCKET_EVENTS.MESSAGE.SEND, { channelId, content, tempId });
  }

  async emit<T>(event: string, data: any): Promise<SocketResponse<T>> {
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

  async joinChannel(channelId: string): Promise<SocketResponse<void>> {
    return this.emit(SOCKET_EVENTS.CHANNEL.JOIN, { channelId });
  }

  async leaveChannel(channelId: string): Promise<SocketResponse<void>> {
    return this.emit(SOCKET_EVENTS.CHANNEL.LEAVE, { channelId });
  }

  async confirmDelivery(messageId: string): Promise<SocketResponse<void>> {
    return this.emit(SOCKET_EVENTS.MESSAGE.CONFIRM, { messageId });
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

  on(event: string, callback: (...args: any[]) => void) {
    this.socket.on(event, callback);
  }

  off(event: string, callback: (...args: any[]) => void) {
    this.socket.off(event, callback);
  }

  public get connected(): boolean {
    return this.connectionState === 'connected';
  }

  public get connecting(): boolean {
    return this.connectionState === 'connecting';
  }

  // Typed event handlers
  onNewMessage<T>(callback: (message: T, eventType: 'new' | 'received') => void): void {
    console.log('[Socket] Setting up message handlers');
    
    this.socket.on(SOCKET_EVENTS.MESSAGE.NEW, (message: any) => {
      console.log('[Socket] Processing message:new event:', { messageId: message.id, processed: this.processedMessageIds.has(message.id) });
      if (!this.processedMessageIds.has(message.id)) {
        this.processedMessageIds.add(message.id);
        console.log('[Socket] Calling callback for new message:', message.id);
        callback(message, 'new');
      } else {
        console.log('[Socket] Skipping duplicate message:', message.id);
      }
    });
    
    this.socket.on(SOCKET_EVENTS.MESSAGE.RECEIVED, (message: any) => {
      console.log('[Socket] Received message:received event:', message);
      callback(message, 'received');
    });
  }

  offNewMessage<T>(callback: (message: T, eventType: 'new' | 'received') => void): void {
    console.log('[Socket] Cleaning up message handlers');
    this.socket.off(SOCKET_EVENTS.MESSAGE.NEW, callback);
    this.socket.off(SOCKET_EVENTS.MESSAGE.RECEIVED, callback);
  }

  onChannelJoined(callback: (data: ChannelEventPayload) => void): void {
    this.socket.on(SOCKET_EVENTS.CHANNEL.JOINED, callback);
  }

  offChannelJoined(callback: (data: ChannelEventPayload) => void): void {
    this.socket.off(SOCKET_EVENTS.CHANNEL.JOINED, callback);
  }

  onChannelLeft(callback: (data: ChannelEventPayload) => void): void {
    this.socket.on(SOCKET_EVENTS.CHANNEL.LEFT, callback);
  }

  offChannelLeft(callback: (data: ChannelEventPayload) => void): void {
    this.socket.off(SOCKET_EVENTS.CHANNEL.LEFT, callback);
  }

  onChannelError(callback: (error: Error) => void): void {
    this.socket.on(SOCKET_EVENTS.CHANNEL.ERROR, callback);
  }

  offChannelError(callback: (error: Error) => void): void {
    this.socket.off(SOCKET_EVENTS.CHANNEL.ERROR, callback);
  }
}