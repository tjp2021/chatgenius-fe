import { io, Socket } from 'socket.io-client';
import { Channel } from '@/types/channel';
import { Message } from '@/types/message';
import { TypingData } from '@/types/typing';
import { ChannelMemberData } from '@/types/channel-member';
import { User } from '@/types/user';
import { SOCKET_EVENTS } from '@/constants/socket-events';

/*******************************************************************
 * ⚠️ WARNING: SOCKET CONFIGURATION ZONE ⚠️
 * 
 * This file contains critical socket.io configuration that took
 * 20+ debugging sessions to get right.
 * 
 * The socket configuration in initializeSocket() is FINAL.
 * DO NOT modify it unless you want to spend another week debugging.
 * 
 * You've been warned! 🔥
 *******************************************************************/

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
  processed?: boolean;
}

interface ReactionEventPayload {
  messageId: string;
  reaction: {
    id: string;
    type: string;
    userId: string;
    timestamp: number;
  };
  processed?: boolean;
}

export interface SocketConfig {
  url: string;
  token: string;
  userId: string;
  reconnectionConfig?: {
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    reconnectionDelayMax?: number;
    timeout?: number;
  };
  onAuthError?: (error: Error) => void;
  onConnectionError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onReconnect?: () => void;
}

interface PendingMessage {
  channelId: string;
  content: string;
  tempId: string;
  retryCount: number;
  timestamp: number;
}

interface SocketResponse {
  success: boolean;
  error?: string;
  data?: any;
}

export class ChatSocketClient {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private reconnectAttempts = 0;
  private isReconnecting = false;
  private pendingMessages: Map<string, PendingMessage> = new Map();
  private processedMessageIds: Set<string> = new Set();
  private processingMessages: Set<string> = new Set();
  private processingReactions: Set<string> = new Set();
  private static instance: ChatSocketClient | null = null;
  private maxReconnectAttempts = 5;
  private isServerDisconnect = false;
  private cleanupInProgress = false;
  private channelListeners = new Set<(channels: Channel[]) => void>();
  private messageListeners = new Set<(message: Message) => void>();
  private typingListeners = new Set<(data: TypingData) => void>();
  private channelMemberListeners = new Set<(data: ChannelMemberData) => void>();

  public auth: {
    userId: string;
    token: string;
  };

  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private readonly INITIAL_RECONNECT_DELAY = 1000;
  private readonly MAX_RECONNECT_DELAY = 5000;

  private constructor(config: SocketConfig) {
    this.config = config;
    this.auth = {
      userId: config.userId,
      token: config.token
    };
    console.log('[Socket] Creating new instance with config:', {
      url: config.url,
      userId: config.userId,
      hasToken: !!config.token
    });
    this.initializeSocket();
  }

  public static getInstance(config: SocketConfig): ChatSocketClient {
    if (!ChatSocketClient.instance) {
      ChatSocketClient.instance = new ChatSocketClient(config);
    }
    return ChatSocketClient.instance;
  }

  private initializeSocket() {
    if (this.socket?.connected) {
      console.log('[Socket] Already connected, skipping initialization');
      return;
    }

    if (!this.config.url || !this.config.token || !this.config.userId) {
      console.error('[Socket] Missing required config:', {
        hasUrl: !!this.config.url,
        hasToken: !!this.config.token,
        hasUserId: !!this.config.userId
      });
      throw new Error('Invalid socket configuration');
    }

    if (this.connectionState === 'connecting') {
      console.log('[Socket] Already connecting, skipping initialization');
      return;
    }

    // Debug connection attempt
    console.log('[Socket][Debug] Starting connection attempt:', {
      timestamp: new Date().toISOString(),
      currentState: this.connectionState,
      config: {
        url: this.config.url,
        userId: this.config.userId,
        hasToken: !!this.config.token
      }
    });

    this.connectionState = 'connecting';
    
    try {
      // Add detailed auth logging
      console.log('[Socket] Auth data:', {
        token: this.config.token,
        userId: this.config.userId,
        url: this.config.url
      });

      /*******************************************************************
       * ⚠️ DANGER ZONE - DO NOT TOUCH SOCKET CONFIGURATION ⚠️
       * 
       * 🛑 STOP! This socket configuration took 20+ debugging sessions!
       * 🛑 DO NOT modify ANY of these settings
       * 🛑 DO NOT change the auth format
       * 🛑 DO NOT touch the transport config
       * 🛑 DO NOT "optimize" or "improve" anything
       * 🛑 DO NOT add or remove any options
       * 
       * If you think something needs to be changed here:
       * 1. You're probably wrong
       * 2. The answer is NO
       * 3. Go fix something else
       * 4. Seriously, don't touch this
       * 
       * You've been warned! 🔥
       *******************************************************************/
      this.socket = io(this.config.url, {
        path: '/socket.io',
        auth: {
          token: this.config.token.startsWith('Bearer ') ? this.config.token : `Bearer ${this.config.token}`,
          userId: this.config.userId
        },
        reconnection: true,
        reconnectionAttempts: this.MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: this.INITIAL_RECONNECT_DELAY,
        reconnectionDelayMax: this.MAX_RECONNECT_DELAY,
        timeout: 10000,
        transports: ['websocket'],
        forceNew: false,
        autoConnect: true,
        withCredentials: false
      });
      /*******************************************************************
       * ⚠️ END OF DANGER ZONE - DO NOT TOUCH ABOVE CODE ⚠️
       *******************************************************************/

      // Debug socket instance
      console.log('[Socket][Debug] Socket instance created:', {
        id: this.socket.id,
        connected: this.socket.connected,
        disconnected: this.socket.disconnected,
        transport: this.socket.io?.engine?.transport?.name || 'unknown'
      });

      // Monitor connection state changes
      this.socket.io.on("error", (error: Error) => {
        console.error('[Socket][Debug] Engine error:', {
          error,
          state: this.connectionState,
          transport: this.socket?.io?.engine?.transport?.name
        });
      });

      this.socket.io.on("reconnect_attempt", (attempt: number) => {
        console.log('[Socket][Debug] Reconnection attempt:', {
          attempt,
          state: this.connectionState,
          transport: this.socket?.io?.engine?.transport?.name
        });
      });

      this.socket.io.on("reconnect_failed", () => {
        console.error('[Socket][Debug] Reconnection failed:', {
          state: this.connectionState,
          transport: this.socket?.io?.engine?.transport?.name,
          attempts: this.reconnectAttempts
        });
      });

      this.socket.on("connect_error", (error: Error) => {
        const auth = this.socket?.auth as { token?: string; userId?: string } | undefined;
        console.error('[Socket][Debug] Connection error:', {
          error: error.message,
          name: error.name,
          stack: error.stack,
          state: this.connectionState,
          transport: this.socket?.io?.engine?.transport?.name,
          auth: {
            hasToken: !!auth?.token,
            tokenPrefix: auth?.token?.substring(0, 10),
            userId: auth?.userId
          }
        });
      });

      this.socket.on("disconnect", (reason: string) => {
        console.log('[Socket][Debug] Disconnected:', {
          reason,
          state: this.connectionState,
          transport: this.socket?.io?.engine?.transport?.name,
          wasConnected: this.socket?.connected
        });
      });

      this.setupEventHandlers();

    } catch (error) {
      this.connectionState = 'disconnected';
      console.error('[Socket][Debug] Initialization failed:', {
        error,
        state: this.connectionState,
        socketExists: !!this.socket
      });
      throw error;
    }
  }

  private setupEventHandlers() {
    const socket = this.socket;
    if (!socket) return;

    // Debug logging for all events
    socket.onAny((event, ...args) => {
      console.log(`[Socket Event] ${event}:`, args);
    });

    // Message event handlers with processing guards
    const handleNewMessage = (data: MessageEventPayload) => {
      const messageKey = `${this.config.userId}:${data.message.id}`;
      
      if (data.processed || this.processingMessages.has(messageKey)) {
        console.log('[Socket] Skipping duplicate message processing:', messageKey);
        return;
      }

      try {
        this.processingMessages.add(messageKey);
        // Handle the message
        this.processedMessageIds.add(data.message.id);
        // Emit confirmation back to server with processed flag
        if (socket.connected) {
          socket.emit(SOCKET_EVENTS.MESSAGE.RECEIVED, {
            messageId: data.message.id,
            processed: true
          });
        }
      } finally {
        this.processingMessages.delete(messageKey);
      }
    };

    const handleNewReaction = (data: ReactionEventPayload) => {
      const reactionKey = `${this.config.userId}:${data.messageId}:${data.reaction.id}`;
      
      if (data.processed || this.processingReactions.has(reactionKey)) {
        console.log('[Socket] Skipping duplicate reaction processing:', reactionKey);
        return;
      }

      try {
        this.processingReactions.add(reactionKey);
        // Handle the reaction
        // Emit confirmation back to server with processed flag
        if (socket.connected) {
          socket.emit(SOCKET_EVENTS.MESSAGE.REACTION_RECEIVED, {
            messageId: data.messageId,
            reactionId: data.reaction.id,
            processed: true
          });
        }
      } finally {
        this.processingReactions.delete(reactionKey);
      }
    };

    // Register event handlers
    socket.on(SOCKET_EVENTS.MESSAGE.NEW, handleNewMessage);
    socket.on(SOCKET_EVENTS.MESSAGE.REACTION_ADDED, handleNewReaction);

    // Connection events
    socket.on('connect', () => {
      console.log('[Socket] Connected:', {
        userId: this.config.userId,
        connectionState: this.connectionState
      });
      
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.config.onConnect?.();
    });

    socket.on('connect_error', (error: Error) => {
      console.error('[Socket] Connection error:', {
        error: error.message,
        userId: this.config.userId,
        connectionState: this.connectionState,
        reconnectAttempts: this.reconnectAttempts,
        socketId: this.socket?.id,
        auth: {
          hasToken: !!this.config.token,
          hasUserId: !!this.config.userId
        },
        timestamp: new Date().toISOString()
      });
      
      this.connectionState = 'disconnected';
      
      if (error.message.includes('Authentication')) {
        console.error('[Socket] Authentication error:', {
          error: error.message,
          userId: this.config.userId,
          hasToken: !!this.config.token,
          timestamp: new Date().toISOString()
        });
        this.config.onAuthError?.(error);
      } else {
        this.config.onConnectionError?.(error);
      }
    });

    socket.on('disconnect', (reason: string) => {
      console.log('[Socket] Disconnected:', {
        reason,
        userId: this.config.userId,
        connectionState: this.connectionState
      });
      
      this.connectionState = 'disconnected';
      this.config.onDisconnect?.(reason);
      
      if (reason === 'io server disconnect') {
        this.isServerDisconnect = true;
        this.cleanup(); // Full cleanup on server disconnect
      } else if (reason === 'io client disconnect' || reason === 'forced close') {
        this.cleanup();
      }
    });

    // Transport events
    socket.io.on("reconnect_attempt", (attempt: number) => {
      if (this.isServerDisconnect || this.cleanupInProgress) {
        console.log('[Socket] Preventing reconnect attempt due to server disconnect or cleanup');
        this.cleanup();
        return;
      }
      
      console.log("[Socket] Reconnection attempt:", { attempt });
      this.reconnectAttempts = attempt;
    });

    socket.io.on("reconnect", () => {
      if (this.isServerDisconnect || this.cleanupInProgress) {
        console.log('[Socket] Preventing reconnect due to server disconnect or cleanup');
        this.cleanup();
        return;
      }

      console.log("[Socket] Reconnected successfully");
      this.connectionState = 'connected';
      this.config.onReconnect?.();
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
    });

    socket.io.on("reconnect_failed", () => {
      console.error("[Socket] Reconnection failed");
      this.cleanup();
    });
  }

  private cleanup() {
    if (this.cleanupInProgress) {
      console.log('[Socket] Cleanup already in progress, skipping');
      return;
    }

    this.cleanupInProgress = true;
    console.log('[Socket] Cleaning up:', {
      socketId: this.socket?.id,
      connectionState: this.connectionState,
      hasSocket: !!this.socket
    });

    // Reset all state
    this.connectionState = 'disconnected';
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
    this.isServerDisconnect = false;
    this.pendingMessages.clear();
    this.processedMessageIds.clear();
    this.processingMessages.clear();
    this.processingReactions.clear();

    // Clear all listeners first
    this.channelListeners.clear();
    this.messageListeners.clear();
    this.typingListeners.clear();
    this.channelMemberListeners.clear();

    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      } catch (error) {
        console.warn('[Socket] Error during socket cleanup:', error);
      }
      this.socket = null;
    }

    // Reset the singleton instance
    ChatSocketClient.instance = null;
    this.cleanupInProgress = false;
  }

  public disconnect() {
    if (this.socket && !this.cleanupInProgress) {
      console.log('SOCKET CLIENT - Starting disconnect', {
        socketId: this.socket.id,
        timestamp: new Date().toISOString()
      });

      this.cleanupInProgress = true;
      
      try {
        // Reset state before disconnecting
        this.channelListeners.clear();
        this.messageListeners.clear();
        this.typingListeners.clear();
        this.channelMemberListeners.clear();
        
        // Remove all listeners
        this.socket.removeAllListeners();
        
        // Disconnect the socket
        this.socket.disconnect();
      } catch (error) {
        console.error('SOCKET CLIENT - Error during disconnect:', error);
      } finally {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.isServerDisconnect = false;
        this.cleanupInProgress = false;
      }
    }
  }

  public isConnected(): boolean {
    return this.connectionState === 'connected' && !!this.socket?.connected;
  }

  public getSocketId(): string | null {
    return this.socket?.id || null;
  }

  // Public properties
  public get id(): string | undefined {
    return this.socket?.id;
  }

  public get io(): any {
    return this.socket?.io;
  }

  // Public methods
  public async sendMessage(channelId: string, content: string, tempId: string): Promise<SocketResponse> {
    if (!this.isConnected() || !this.socket) {
      return { success: false, error: 'Socket not connected' };
    }

    const messageKey = `${this.config.userId}:${tempId}`;
    if (this.processingMessages.has(messageKey)) {
      return { success: false, error: 'Message already being processed' };
    }

    return new Promise((resolve) => {
      try {
        this.processingMessages.add(messageKey);
        this.socket!.emit('send_message', {
          channelId,
          content,
          tempId,
          processed: false // Initial emission is unprocessed
        }, (response: SocketResponse) => {
          if (response.success) {
            this.pendingMessages.delete(tempId);
          } else {
            this.pendingMessages.set(tempId, {
              channelId,
              content,
              tempId,
              retryCount: 0,
              timestamp: Date.now()
            });
          }
          resolve(response);
        });
      } finally {
        this.processingMessages.delete(messageKey);
      }
    });
  }

  public async joinChannel(channelId: string): Promise<SocketResponse> {
    if (!this.isConnected() || !this.socket) {
      return { success: false, error: 'Socket not connected' };
    }

    return new Promise((resolve) => {
      this.socket!.emit('join_channel', { channelId }, (response: SocketResponse) => {
        resolve(response);
      });
    });
  }

  public async leaveChannel(channelId: string): Promise<SocketResponse> {
    if (!this.isConnected() || !this.socket) {
      return { success: false, error: 'Socket not connected' };
    }

    return new Promise((resolve) => {
      this.socket!.emit('leave_channel', { channelId }, (response: SocketResponse) => {
        resolve(response);
      });
    });
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    if (!this.socket) {
      console.warn('[Socket] Skipping add listener - socket not initialized');
      return;
    }
    this.socket.on(event, callback);
  }

  public off(event: string, callback: (...args: any[]) => void): void {
    if (!this.socket) {
      console.warn('[Socket] Skipping remove listener - socket not initialized');
      return;
    }
    this.socket.off(event, callback);
  }

  public async emit(event: string, data: any): Promise<SocketResponse> {
    if (!this.isConnected() || !this.socket) {
      return { success: false, error: 'Socket not connected' };
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({ success: false, error: 'Server did not respond in time' });
      }, 5000);

      this.socket!.emit(event, data, (response: SocketResponse) => {
        clearTimeout(timeoutId);
        console.log(`[Socket] Received response for ${event}:`, response);
        resolve(response || { success: false, error: 'No response from server' });
      });
    });
  }

  public async confirmDelivery(messageId: string): Promise<SocketResponse> {
    return this.emit(SOCKET_EVENTS.MESSAGE.CONFIRM, { messageId });
  }

  public updateCredentials(token: string, userId: string): void {
    if (!this.socket) {
      console.warn('[Socket] Cannot update credentials - socket is null');
      return;
    }
    
    this.config = {
      ...this.config,
      token,
      userId
    };
    
    this.socket.auth = { token, userId };
    this.socket.disconnect().connect();
  }

  public get connected(): boolean {
    return this.connectionState === 'connected';
  }

  public get connecting(): boolean {
    return this.connectionState === 'connecting';
  }

  // Typed event handlers with null checks
  onNewMessage<T>(callback: (message: T, eventType: 'new' | 'received') => void): void {
    if (!this.socket) {
      console.warn('[Socket] Skipping message handlers - socket not initialized');
      return;
    }

    console.log('[Socket] Setting up message handlers');
    
    this.socket.on(SOCKET_EVENTS.MESSAGE.NEW, (message: any) => {
      if (!this.socket?.connected) return;
      
      console.log('[Socket] Processing message:new event:', { 
        messageId: message.id, 
        processed: this.processedMessageIds.has(message.id) 
      });
      
      if (!this.processedMessageIds.has(message.id)) {
        this.processedMessageIds.add(message.id);
        console.log('[Socket] Calling callback for new message:', message.id);
        callback(message, 'new');
      } else {
        console.log('[Socket] Skipping duplicate message:', message.id);
      }
    });
    
    this.socket.on(SOCKET_EVENTS.MESSAGE.RECEIVED, (message: any) => {
      if (!this.socket?.connected) return;
      console.log('[Socket] Received message:received event:', message);
      callback(message, 'received');
    });
  }

  offNewMessage<T>(callback: (message: T, eventType: 'new' | 'received') => void): void {
    if (!this.socket) {
      console.warn('[Socket] Skipping cleanup - socket not initialized');
      return;
    }
    console.log('[Socket] Cleaning up message handlers');
    this.socket.off(SOCKET_EVENTS.MESSAGE.NEW, callback);
    this.socket.off(SOCKET_EVENTS.MESSAGE.RECEIVED, callback);
  }

  private handleSocketEvent<T>(
    action: 'on' | 'off',
    event: string,
    callback: (data: T) => void,
    context: string
  ): void {
    // Early return if socket is null, but don't warn for 'off' actions during cleanup
    if (!this.socket) {
      if (action === 'on') {
        console.warn(`[Socket] Cannot add ${context} listener - socket not initialized`);
      }
      return;
    }

    try {
      if (action === 'off' && !this.socket.hasListeners(event)) {
        // Skip removing if no listeners exist
        return;
      }
      this.socket[action](event, callback);
    } catch (error) {
      console.warn(`[Socket] Error ${action === 'on' ? 'adding' : 'removing'} ${context} listener:`, error);
    }
  }

  onChannelJoined(callback: (data: ChannelEventPayload) => void): void {
    this.handleSocketEvent('on', SOCKET_EVENTS.CHANNEL.JOINED, callback, 'channel joined');
  }

  offChannelJoined(callback: (data: ChannelEventPayload) => void): void {
    this.handleSocketEvent('off', SOCKET_EVENTS.CHANNEL.JOINED, callback, 'channel joined');
  }

  onChannelLeft(callback: (data: ChannelEventPayload) => void): void {
    this.handleSocketEvent('on', SOCKET_EVENTS.CHANNEL.LEFT, callback, 'channel left');
  }

  offChannelLeft(callback: (data: ChannelEventPayload) => void): void {
    this.handleSocketEvent('off', SOCKET_EVENTS.CHANNEL.LEFT, callback, 'channel left');
  }

  onChannelError(callback: (error: Error) => void): void {
    this.handleSocketEvent('on', SOCKET_EVENTS.CHANNEL.ERROR, callback, 'channel error');
  }

  offChannelError(callback: (error: Error) => void): void {
    this.handleSocketEvent('off', SOCKET_EVENTS.CHANNEL.ERROR, callback, 'channel error');
  }

  onChannelCreated(callback: (data: ChannelEventPayload) => void): void {
    this.handleSocketEvent('on', SOCKET_EVENTS.CHANNEL.CREATED, callback, 'channel created');
  }

  offChannelCreated(callback: (data: ChannelEventPayload) => void): void {
    this.handleSocketEvent('off', SOCKET_EVENTS.CHANNEL.CREATED, callback, 'channel created');
  }

  onChannelUpdated(callback: (data: ChannelEventPayload) => void): void {
    this.handleSocketEvent('on', SOCKET_EVENTS.CHANNEL.UPDATED, callback, 'channel updated');
  }

  offChannelUpdated(callback: (data: ChannelEventPayload) => void): void {
    this.handleSocketEvent('off', SOCKET_EVENTS.CHANNEL.UPDATED, callback, 'channel updated');
  }

  onChannelDeleted(callback: (data: ChannelEventPayload) => void): void {
    this.handleSocketEvent('on', SOCKET_EVENTS.CHANNEL.DELETED, callback, 'channel deleted');
  }

  offChannelDeleted(callback: (data: ChannelEventPayload) => void): void {
    this.handleSocketEvent('off', SOCKET_EVENTS.CHANNEL.DELETED, callback, 'channel deleted');
  }

  // Thread methods
  public async joinThread(threadId: string, channelId: string): Promise<SocketResponse> {
    if (!this.isConnected() || !this.socket) {
      return { success: false, error: 'Socket not connected' };
    }

    return new Promise((resolve) => {
      this.socket!.emit(SOCKET_EVENTS.THREAD.JOIN, { 
        threadId,
        channelId
      }, (response: SocketResponse) => {
        resolve(response);
      });
    });
  }

  public async leaveThread(threadId: string, channelId: string): Promise<SocketResponse> {
    if (!this.isConnected() || !this.socket) {
      return { success: false, error: 'Socket not connected' };
    }

    return new Promise((resolve) => {
      this.socket!.emit(SOCKET_EVENTS.THREAD.LEAVE, { 
        threadId,
        channelId
      }, (response: SocketResponse) => {
        resolve(response);
      });
    });
  }

  public async sendThreadReply(content: string, threadId: string, channelId: string, tempId: string): Promise<SocketResponse> {
    if (!this.isConnected() || !this.socket) {
      return { success: false, error: 'Socket not connected' };
    }

    const messageKey = `${this.config.userId}:${threadId}:${tempId}`;
    if (this.processingMessages.has(messageKey)) {
      return { success: false, error: 'Message already being processed' };
    }

    return new Promise((resolve) => {
      try {
        this.processingMessages.add(messageKey);
        this.socket!.emit(SOCKET_EVENTS.THREAD.REPLY, {
          content,
          threadId,
          channelId,
          tempId,
          processed: false
        }, (response: SocketResponse) => {
          if (response.success) {
            this.pendingMessages.delete(tempId);
          } else {
            this.pendingMessages.set(tempId, {
              channelId,
              content,
              tempId,
              retryCount: 0,
              timestamp: Date.now()
            });
          }
          resolve(response);
        });
      } finally {
        this.processingMessages.delete(messageKey);
      }
    });
  }

  // Thread event handlers
  onThreadJoined(callback: (data: { threadId: string; userId: string; timestamp: Date }) => void): void {
    this.handleSocketEvent('on', SOCKET_EVENTS.THREAD.JOINED, callback, 'thread joined');
  }

  offThreadJoined(callback: (data: { threadId: string; userId: string; timestamp: Date }) => void): void {
    this.handleSocketEvent('off', SOCKET_EVENTS.THREAD.JOINED, callback, 'thread joined');
  }

  onThreadReplyDelivered(callback: (data: { messageId: string; threadId: string; tempId: string; status: 'DELIVERED'; processed: true }) => void): void {
    this.handleSocketEvent('on', SOCKET_EVENTS.THREAD.REPLY_DELIVERED, callback, 'thread reply delivered');
  }

  offThreadReplyDelivered(callback: (data: { messageId: string; threadId: string; tempId: string; status: 'DELIVERED'; processed: true }) => void): void {
    this.handleSocketEvent('off', SOCKET_EVENTS.THREAD.REPLY_DELIVERED, callback, 'thread reply delivered');
  }

  onThreadReplyCreated(callback: (data: { message: Message; threadId: string; tempId?: string; processed: true }) => void): void {
    this.handleSocketEvent('on', SOCKET_EVENTS.THREAD.REPLY_CREATED, callback, 'thread reply created');
  }

  offThreadReplyCreated(callback: (data: { message: Message; threadId: string; tempId?: string; processed: true }) => void): void {
    this.handleSocketEvent('off', SOCKET_EVENTS.THREAD.REPLY_CREATED, callback, 'thread reply created');
  }

  onThreadReplyFailed(callback: (data: { error: string; threadId: string; tempId: string; status: 'FAILED'; processed: true }) => void): void {
    this.handleSocketEvent('on', SOCKET_EVENTS.THREAD.REPLY_FAILED, callback, 'thread reply failed');
  }

  offThreadReplyFailed(callback: (data: { error: string; threadId: string; tempId: string; status: 'FAILED'; processed: true }) => void): void {
    this.handleSocketEvent('off', SOCKET_EVENTS.THREAD.REPLY_FAILED, callback, 'thread reply failed');
  }

  onThreadUpdated(callback: (data: { threadId: string; replyCount: number; lastReply: Message; processed: true }) => void): void {
    this.handleSocketEvent('on', SOCKET_EVENTS.THREAD.UPDATED, callback, 'thread updated');
  }

  offThreadUpdated(callback: (data: { threadId: string; replyCount: number; lastReply: Message; processed: true }) => void): void {
    this.handleSocketEvent('off', SOCKET_EVENTS.THREAD.UPDATED, callback, 'thread updated');
  }
}