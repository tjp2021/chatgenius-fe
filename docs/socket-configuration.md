# Socket Configuration Documentation

## Frontend Configuration

Our frontend uses Socket.IO client with the following configuration:

### Environment Variables

```env
NEXT_PUBLIC_SOCKET_URL=<your-socket-server-url>  # e.g., http://localhost:3001
```

### Socket Connection Settings

```typescript
const socketConfig = {
  path: '/api/socket.io',
  addTrailingSlash: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  withCredentials: true,
  autoConnect: true,
}
```

### Authentication

The socket connection includes authentication via the `auth` parameter:
```typescript
auth: {
  userId: string  // Clerk Auth userId
}
```

## Required NestJS Backend Configuration

To connect with our frontend, configure your NestJS server as follows:

### Installation

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### Gateway Configuration

```typescript
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL,  // Your frontend URL
    credentials: true
  },
  path: '/api/socket.io',
  transports: ['websocket', 'polling'],
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  // Handle connection
  handleConnection(client: Socket) {
    const userId = client.handshake.auth.userId;
    if (!userId) {
      client.disconnect();
      return;
    }
    // Store user connection
  }

  // Handle disconnection
  handleDisconnect(client: Socket) {
    // Clean up user connection
  }
}
```

### Required Event Handlers

Your NestJS backend needs to implement these socket events:

1. **Channel Events**:
```typescript
// Join a channel
@SubscribeMessage('join_channel')
handleJoinChannel(client: Socket, payload: { channelId: string }) {
  client.join(payload.channelId);
}

// Leave a channel
@SubscribeMessage('leave_channel')
handleLeaveChannel(client: Socket, payload: { channelId: string }) {
  client.leave(payload.channelId);
}
```

2. **Message Events**:
```typescript
// Handle new message
@SubscribeMessage('send_message')
async handleMessage(client: Socket, payload: {
  channelId: string;
  content: string;
  tempId: string;
}) {
  try {
    // 1. Save message to database
    const savedMessage = await this.messageService.create({
      content: payload.content,
      channelId: payload.channelId,
      userId: client.handshake.auth.userId,
    });

    // 2. Emit to sender for confirmation
    client.emit('message_sent', {
      tempId: payload.tempId,
      success: true,
      message: savedMessage
    });

    // 3. Broadcast to channel
    this.server.to(payload.channelId).emit('message_new', savedMessage);
  } catch (error) {
    client.emit('message_sent', {
      tempId: payload.tempId,
      success: false,
      error: 'Failed to save message'
    });
  }
}
```

3. **Reaction Events**:
```typescript
// Handle message reactions
@SubscribeMessage('react_to_message')
async handleReaction(client: Socket, payload: {
  messageId: string;
  reaction: string;
  channelId: string;
}) {
  try {
    // Save reaction and broadcast to channel
    const updatedMessage = await this.messageService.addReaction({
      messageId: payload.messageId,
      userId: client.handshake.auth.userId,
      reaction: payload.reaction
    });
    
    this.server.to(payload.channelId).emit('message_updated', updatedMessage);
  } catch (error) {
    client.emit('reaction_error', {
      messageId: payload.messageId,
      error: 'Failed to add reaction'
    });
  }
}
```

### Message Types

Ensure your message types match the frontend:

```typescript
interface Message {
  id: string;
  content: string;
  channelId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  isRead: boolean;
  isDelivered: boolean;
  user: {
    id: string;
    name: string;
  };
  reactions: MessageReaction[];
}

interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  reaction: string;
  createdAt: string;
}
```

## Error Handling

The frontend listens for these error events:
- `connect_error`: Socket connection errors
- `message_sent`: Message delivery confirmation/failure
- `reaction_error`: Reaction-related errors

Ensure your NestJS backend emits appropriate error events with descriptive messages.

## Security Considerations

1. **CORS Configuration**: Ensure your NestJS CORS settings match the frontend origin
2. **Authentication**: Validate `userId` on connection and all subsequent events
3. **Rate Limiting**: Implement rate limiting for message and reaction events
4. **Input Validation**: Validate all incoming event payloads
5. **Channel Authorization**: Verify user's permission to join/message in channels

## Environment Variables (NestJS)

```env
FRONTEND_URL=<your-frontend-url>  # e.g., http://localhost:3000
CORS_ORIGINS=<allowed-origins>    # comma-separated list of allowed origins
``` 