# Socket Server User Data Implementation

## Overview
This document outlines how to modify the WebSocket server to include user data in message events, ensuring that all messages contain the sender's information.

## Implementation Steps

### 1. Store Connected Users
Create a Map to store user data for all connected users:

```typescript
const connectedUsers = new Map<string, {
  id: string;
  name: string;
  fullName: string;
  imageUrl?: string;
}>();
```

### 2. Handle User Connections
When a user connects, store their data:

```typescript
io.on('connection', async (socket) => {
  // Get token from connection handshake
  const token = socket.handshake.auth.token;
  
  // Verify token and get user data from your database
  const userData = await getUserFromDatabase(token);
  
  // Store user data mapped to their socket ID
  connectedUsers.set(socket.id, userData);
  
  console.log(`User connected: ${userData.name} (${socket.id})`);
});
```

### 3. Handle Message Events
Attach user data to all message events:

```typescript
socket.on('message', async (data) => {
  // Get sender's data from our connected users map
  const sender = connectedUsers.get(socket.id);
  
  // Create message in database with user data
  const message = await createMessage({
    ...data,
    user: {
      id: sender.id,
      name: sender.name,
      fullName: sender.fullName,
      imageUrl: sender.imageUrl
    }
  });

  // Broadcast to other users in the channel
  socket.to(data.channelId).emit('message', {
    ...message,
    user: {
      id: sender.id,
      name: sender.name,
      fullName: sender.fullName,
      imageUrl: sender.imageUrl
    }
  });

  // Send confirmation back to sender
  socket.emit('message:sent', {
    ...message,
    user: {
      id: sender.id,
      name: sender.name,
      fullName: sender.fullName,
      imageUrl: sender.imageUrl
    }
  });
});
```

### 4. Handle Disconnections
Clean up user data when they disconnect:

```typescript
socket.on('disconnect', () => {
  const userData = connectedUsers.get(socket.id);
  if (userData) {
    console.log(`User disconnected: ${userData.name} (${socket.id})`);
  }
  connectedUsers.delete(socket.id);
});
```

## Message Structure
Messages will now include a user object with the following structure:

```typescript
interface Message {
  id: string;
  content: string;
  channelId: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    fullName: string;
    imageUrl?: string;
  }
}
```

## Frontend Considerations
The frontend should expect and handle the user object in all message events. This eliminates the need for placeholder text like "Unknown User" as all messages will include the sender's information.

## Error Handling
Consider implementing these error handling measures:

1. Validate user data exists before sending messages
2. Handle cases where user data might be incomplete
3. Implement reconnection logic that restores user data
4. Log any instances where user data is missing

## Security Considerations
1. Always verify the token before storing user data
2. Sanitize user data before broadcasting
3. Implement rate limiting for message sending
4. Regularly clean up stored user data for inactive connections

## Testing
Test the following scenarios:

1. User connects with valid token
2. User connects with invalid token
3. Message sending with complete user data
4. Message receiving with complete user data
5. User disconnection and cleanup
6. Multiple users in the same channel
7. Reconnection scenarios 