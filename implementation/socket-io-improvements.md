# Socket.IO Implementation Improvements PRD

## Problem Analysis [CG-20231218-001]

### Current Issues
1. **Connection Management**
   - Race conditions in socket connection establishment
   - Lack of proper timeout handling
   - No clear connection lifecycle management
   - Missing reconnection strategies

2. **Channel Subscription**
   - Subscription timeouts occurring frequently
   - No proper subscription state management
   - Missing retry logic for failed subscriptions
   - Unclear subscription lifecycle
   - Joining and leaving channels are not updated in the UI?UX in realtime
   

3. **Message Synchronization**
   - Messages not properly syncing between sender and receiver
   - Missing message ordering guarantees
   - Incomplete message acknowledgment system
   - Optimistic updates not properly handled

4. **Event Handling**
   - Event handlers not properly cleaning up
   - Reconnection scenarios not handled
   - Missing error boundaries
   - Incomplete event lifecycle management

## Solution Walkthrough [CG-20231218-001]

### Frontend Implementation

#### 1. Socket Provider Improvements
```typescript
// src/providers/socket-provider.tsx

interface SocketManagerConfig {
  url: string;
  auth: {
    userId: string;
    token: string;
  };
  reconnection: boolean;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  reconnectionDelayMax: number;
  timeout: number;
}

class SocketManager {
  private manager: Manager;
  private socket: Socket | null = null;
  private connectionPromise: Promise<void> | null = null;

  constructor(config: SocketManagerConfig) {
    this.manager = new Manager(config.url, {
      auth: config.auth,
      transports: ['websocket'],
      reconnection: config.reconnection,
      reconnectionAttempts: config.reconnectionAttempts,
      reconnectionDelay: config.reconnectionDelay,
      reconnectionDelayMax: config.reconnectionDelayMax,
      timeout: config.timeout,
      autoConnect: false
    });
  }

  async connect(): Promise<void> {
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      this.socket = this.manager.socket('/');
      
      this.socket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      this.socket.connect();
    });

    return this.connectionPromise;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionPromise = null;
    }
  }
}
```

#### 2. Channel Subscription System
```typescript
// src/hooks/use-channel-subscription.ts

interface SubscriptionManager {
  subscribe(channelId: string): Promise<void>;
  unsubscribe(channelId: string): Promise<void>;
  getState(channelId: string): SubscriptionState;
}

class ChannelSubscriptionManager implements SubscriptionManager {
  private socket: Socket;
  private subscriptions: Map<string, SubscriptionState>;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(socket: Socket) {
    this.socket = socket;
    this.subscriptions = new Map();
  }

  async subscribe(channelId: string): Promise<void> {
    const state = this.subscriptions.get(channelId);
    if (state?.status === 'subscribed') return;

    this.updateState(channelId, { status: 'subscribing', retryCount: 0 });

    try {
      await this.attemptSubscribe(channelId);
      this.updateState(channelId, { status: 'subscribed', retryCount: 0 });
    } catch (error) {
      this.updateState(channelId, { status: 'failed', retryCount: 0 });
      throw error;
    }
  }

  private async attemptSubscribe(channelId: string, retryCount: number = 0): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Subscription timeout'));
        }, 5000);

        this.socket.emit('channel:join', { channelId }, (response: { error?: string }) => {
          clearTimeout(timeout);
          if (response.error) reject(new Error(response.error));
          else resolve();
        });
      });
    } catch (error) {
      if (retryCount < this.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.attemptSubscribe(channelId, retryCount + 1);
      }
      throw error;
    }
  }
}
```

#### 3. Message Synchronization System
```typescript
// src/hooks/use-message-sync.ts

interface MessageSync {
  sendMessage(message: MessagePayload): Promise<string>;
  updateMessage(messageId: string, update: Partial<Message>): Promise<void>;
  deleteMessage(messageId: string): Promise<void>;
}

class MessageSyncManager implements MessageSync {
  private socket: Socket;
  private pendingMessages: Map<string, MessagePayload>;
  private messageOrder: string[];
  private maxRetries: number = 3;

  constructor(socket: Socket) {
    this.socket = socket;
    this.pendingMessages = new Map();
    this.messageOrder = [];
  }

  async sendMessage(message: MessagePayload): Promise<string> {
    const tempId = `temp-${Date.now()}`;
    this.pendingMessages.set(tempId, message);

    try {
      const messageId = await this.attemptSend(message, tempId);
      this.pendingMessages.delete(tempId);
      return messageId;
    } catch (error) {
      this.pendingMessages.delete(tempId);
      throw error;
    }
  }

  private async attemptSend(message: MessagePayload, tempId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Message send timeout'));
      }, 5000);

      this.socket.emit('message:send', {
        ...message,
        tempId
      }, (response: { error?: string; messageId?: string }) => {
        clearTimeout(timeout);
        if (response.error) reject(new Error(response.error));
        else if (response.messageId) resolve(response.messageId);
      });
    });
  }
}
```

### Backend Requirements

#### 1. Socket.IO Server Configuration
```typescript
// server/socket/config.ts

interface SocketServerConfig {
  pingTimeout: number;
  pingInterval: number;
  upgradeTimeout: number;
  maxHttpBufferSize: number;
  transports: string[];
  cors: {
    origin: string[];
    methods: string[];
    credentials: boolean;
  };
}

const socketServerConfig: SocketServerConfig = {
  pingTimeout: 20000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6, // 1MB
  transports: ['websocket'],
  cors: {
    origin: [process.env.FRONTEND_URL],
    methods: ['GET', 'POST'],
    credentials: true
  }
};
```

#### 2. Channel Subscription Handler
```typescript
// server/socket/handlers/channel-handler.ts

interface ChannelHandler {
  handleJoin(socket: Socket, data: JoinChannelData): Promise<void>;
  handleLeave(socket: Socket, data: LeaveChannelData): Promise<void>;
  handleDisconnect(socket: Socket): Promise<void>;
}

class ChannelSubscriptionHandler implements ChannelHandler {
  private subscriptions: Map<string, Set<string>>;
  private db: Database;

  constructor(db: Database) {
    this.subscriptions = new Map();
    this.db = db;
  }

  async handleJoin(socket: Socket, { channelId }: JoinChannelData): Promise<void> {
    try {
      // Validate channel access
      await this.validateAccess(socket.userId, channelId);
      
      // Join socket.io room
      await socket.join(`channel:${channelId}`);
      
      // Track subscription
      this.addSubscription(channelId, socket.id);
      
      // Send initial state
      await this.sendInitialState(socket, channelId);
      
      socket.emit('channel:joined', { channelId });
    } catch (error) {
      socket.emit('channel:error', { 
        channelId, 
        error: error.message 
      });
    }
  }
}
```

#### 3. Message Handler
```typescript
// server/socket/handlers/message-handler.ts

interface MessageHandler {
  handleSend(socket: Socket, message: MessagePayload): Promise<void>;
  handleTyping(socket: Socket, data: TypingData): Promise<void>;
  handleDeliveryUpdate(socket: Socket, data: DeliveryUpdate): Promise<void>;
}

class MessageEventHandler implements MessageHandler {
  private db: Database;
  private io: Server;

  constructor(io: Server, db: Database) {
    this.io = io;
    this.db = db;
  }

  async handleSend(socket: Socket, message: MessagePayload): Promise<void> {
    try {
      // Validate message
      await this.validateMessage(message);
      
      // Store in database
      const storedMessage = await this.db.messages.create({
        data: {
          ...message,
          userId: socket.userId
        }
      });
      
      // Broadcast to channel
      this.io.to(`channel:${message.channelId}`).emit('message:new', storedMessage);
      
      // Acknowledge sender
      socket.emit('message:sent', {
        messageId: storedMessage.id,
        status: MessageDeliveryStatus.SENT
      });
    } catch (error) {
      socket.emit('message:error', {
        tempId: message.tempId,
        error: error.message
      });
    }
  }
}
```

### Implementation Steps

1. **Frontend**:
   - Implement SocketManager class
   - Implement ChannelSubscriptionManager
   - Implement MessageSyncManager
   - Update socket-provider.tsx with new connection management
   - Update use-messages.ts with new message sync system
   - Add error boundaries and retry logic
   - Implement proper cleanup in useEffect hooks

2. **Backend**:
   - Configure Socket.IO server with optimal settings
   - Implement ChannelSubscriptionHandler
   - Implement MessageEventHandler
   - Add database transaction support for message operations
   - Implement proper error handling and logging
   - Add monitoring for socket connections and events

### Testing Requirements

1. **Unit Tests**:
   - Test all manager classes independently
   - Test error handling and retry logic
   - Test state management
   - Test cleanup functions

2. **Integration Tests**:
   - Test connection lifecycle
   - Test subscription lifecycle
   - Test message synchronization
   - Test reconnection scenarios

3. **End-to-End Tests**:
   - Test real-time message delivery
   - Test multiple client scenarios
   - Test error recovery
   - Test performance under load

### Monitoring Requirements

1. **Metrics to Track**:
   - Connection success rate
   - Subscription success rate
   - Message delivery latency
   - Error rates by type
   - Reconnection success rate

2. **Logging Requirements**:
   - Connection lifecycle events
   - Subscription state changes
   - Message delivery status
   - Error details with stack traces
   - Performance metrics

### Deployment Strategy

1. **Phase 1: Infrastructure**
   - Deploy Socket.IO server changes
   - Configure monitoring
   - Set up logging

2. **Phase 2: Backend Changes**
   - Deploy new handlers
   - Enable database transactions
   - Configure error tracking

3. **Phase 3: Frontend Changes**
   - Deploy new socket provider
   - Deploy subscription management
   - Deploy message sync system

4. **Phase 4: Validation**
   - Monitor metrics
   - Track error rates
   - Validate performance
   - Gather user feedback 