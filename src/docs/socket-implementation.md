# Socket Implementation Documentation

## Overview
This document outlines our WebSocket implementation for real-time chat functionality using Socket.IO. The implementation follows a simplified, single-source-of-truth pattern with three main components:

1. Socket Client (Core functionality)
2. Socket Hook (React integration)
3. Socket Provider (App-wide socket context)

## Socket Client (`src/lib/socket-client.ts`)

### Configuration
```typescript
interface SocketConfig {
  url: string;        // WebSocket server URL
  token: string;      // Raw Clerk JWT token (no 'Bearer' prefix)
  userId: string;     // User's Clerk ID
  onAuthError?: (error: Error) => void;      // Auth failure callback
  onConnectionError?: (error: Error) => void; // Connection error callback
  onReconnect?: () => void;                  // Successful reconnection callback
}
```

### Connection Settings
```typescript
{
  auth: {
    token: config.token,   // Raw JWT token
    userId: config.userId  // User ID
  },
  reconnection: true,
  reconnectionDelay: 1000,      // 1 second
  reconnectionAttempts: 5,      // Max 5 attempts
}
```

### Supported Events

#### Outgoing Events (Client → Server)
1. `message:send`
   ```typescript
   // Payload
   {
     channelId: string;
     content: string;
     tempId?: string;  // For optimistic updates
   }
   // Response
   {
     success: boolean;
     data?: T;        // Message data if successful
     error?: string;  // Error message if failed
   }
   ```

2. `message:delivered`
   ```typescript
   // Payload
   {
     messageId: string;
   }
   // Response
   {
     success: boolean;
     error?: string;
   }
   ```

3. `message:read`
   ```typescript
   // Payload
   {
     messageId: string;
   }
   // Response
   {
     success: boolean;
     error?: string;
   }
   ```

#### Incoming Events (Server → Client)
1. `message:new` - New message received
2. `connect_error` - Connection/auth errors
3. `reconnect` - Successful reconnection

### Methods

#### \`sendMessage\`
Sends a new message to a channel.
```typescript
async sendMessage<T>(
  channelId: string, 
  content: string,
  tempId?: string
): Promise<SocketResponse<T>>
```

#### \`confirmDelivery\`
Confirms message delivery.
```typescript
async confirmDelivery(
  messageId: string
): Promise<SocketResponse<void>>
```

#### \`markAsRead\`
Marks a message as read.
```typescript
async markAsRead(
  messageId: string
): Promise<SocketResponse<void>>
```

#### \`onNewMessage\`
Subscribes to new messages.
```typescript
onNewMessage<T>(callback: (message: T) => void): () => void
```

#### \`updateCredentials\`
Updates auth credentials and reconnects.
```typescript
updateCredentials(token: string, userId: string): void
```

## React Hook (`src/hooks/useSocket.ts`)

### Usage
```typescript
const {
  socket,          // Socket instance
  sendMessage,     // Send message function
  markAsRead,      // Mark as read function
  confirmDelivery  // Confirm delivery function
} = useSocket();
```

### Features
- Automatic token refresh
- Automatic reconnection
- Cleanup on unmount
- Error handling
- Type-safe responses

### Example Usage
```typescript
function ChatComponent() {
  const { sendMessage } = useSocket();

  const handleSend = async (content: string) => {
    try {
      const response = await sendMessage(channelId, content);
      if (response?.success) {
        // Handle successful send
      }
    } catch (error) {
      // Handle error
    }
  };
}
```

## Socket Provider (`src/providers/socket-provider.tsx`)

### Setup
Wrap your app with the provider:
```typescript
function App() {
  return (
    <SocketProvider>
      <YourApp />
    </SocketProvider>
  );
}
```

### Usage in Components
```typescript
function Component() {
  const socket = useSocket();
  // Use socket methods
}
```

## Error Handling

### Authentication Errors
- Token missing or invalid
- User not authenticated
- Token expired

### Connection Errors
- Server unreachable
- Network issues
- Rate limiting

### Recovery Strategy
1. Auto-refresh token on auth errors
2. Auto-reconnect on connection loss
3. Max 5 reconnection attempts
4. 1-second delay between attempts

## Best Practices

### DO
- Use the socket provider at the app root
- Clean up subscriptions when component unmounts
- Handle errors appropriately
- Use type-safe message handling

### DON'T
- Create multiple socket instances
- Mix socket state with React Query cache
- Manually manage connection state
- Skip error handling

## Migration Guide

### From Old Implementation
1. Remove all React Query cache manipulation
2. Use socket events instead of REST API for real-time updates
3. Remove complex state management
4. Use the simplified hook API

### Example Migration
```typescript
// OLD
const { data } = useQuery(['messages'], fetchMessages);

// NEW
const { socket } = useSocket();
useEffect(() => {
  const unsubscribe = socket.onNewMessage(handleNewMessage);
  return unsubscribe;
}, [socket]);
```

## Troubleshooting

### Common Issues
1. Authentication Failures
   - Check token format (no 'Bearer' prefix)
   - Verify token expiration
   - Check user ID matches token

2. Connection Issues
   - Verify WebSocket URL
   - Check network connectivity
   - Verify server status

3. Message Handling
   - Verify channel ID
   - Check message format
   - Verify socket connected state

### Debugging
Enable socket debugging:
```typescript
localStorage.setItem('debug', 'socket.io-client:socket');
```

---
Last Updated: 2024-01-11
Version: 1.0.0 