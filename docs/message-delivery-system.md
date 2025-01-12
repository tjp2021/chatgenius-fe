# Message Delivery System Documentation

## Overview
The message delivery system implements a real-time chat functionality with message status tracking. It uses Socket.IO for real-time communication and implements a robust message delivery confirmation flow.

## Core Components

### 1. Message Status Types
```typescript
interface MessageStatus {
  id: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

enum MessageDeliveryStatus {
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}
```

### 2. Socket Event Payloads
```typescript
interface MessageDeliveredPayload {
  messageId: string;
  tempId: string;
  status: MessageDeliveryStatus.DELIVERED;
  processed: true;
}

interface MessageCreatedPayload {
  message: Message;
  tempId: string;
  processed: true;
}

interface MessageFailedPayload {
  error: string;
  tempId: string;
  status: MessageDeliveryStatus.FAILED;
  processed: true;
}
```

## Message Flow

### 1. Sending a Message
```typescript
// 1. Create temporary message
const tempMessage = {
  id: `temp-${Date.now()}-${randomString}-${userId}`,
  content,
  // ... other fields
};

// 2. Add to UI immediately
setLocalMessages(prev => [...prev, tempMessage]);
setMessageStatuses(prev => [...prev, { id: tempMessage.id, status: 'sending' }]);

// 3. Emit to server
socket.emit('message:send', {
  content,
  channelId,
  tempId: tempMessage.id
});
```

### 2. Server Response Flow
The server responds with a sequence of events:

1. `message:delivered` - Confirms delivery to sender
2. `message:created` - Broadcasts to all channel members
3. `message:failed` - Sent if message fails to process

### 3. Event Handlers

#### Message Delivered Handler
```typescript
const handleMessageDelivered = (payload: MessageDeliveredPayload) => {
  if (payload.processed && payload.status === MessageDeliveryStatus.DELIVERED) {
    setMessageStatuses(prev => prev.map(status =>
      status.id === payload.tempId 
        ? { ...status, status: 'delivered' } 
        : status
    ));
  }
};
```

#### Message Created Handler
```typescript
const handleMessageCreated = (payload: MessageCreatedPayload) => {
  if (payload.processed && payload.message) {
    // Replace temporary message with confirmed one
    setLocalMessages(prev => {
      const filtered = prev.filter(msg => msg.id !== payload.tempId);
      return [...filtered, payload.message];
    });

    // Update status to sent
    if (payload.tempId) {
      setMessageStatuses(prev => prev.map(status =>
        status.id === payload.tempId 
          ? { ...status, status: 'sent' }
          : status
      ));
    }
  }
};
```

## Critical Implementation Details

### 1. Socket Event Registration
```typescript
useEffect(() => {
  if (!socket || !isConnected) return;

  socket.on('message:delivered', handleMessageDelivered);
  socket.on('message:created', handleMessageCreated);
  socket.on('message:failed', handleMessageFailed);

  return () => {
    socket.off('message:delivered', handleMessageDelivered);
    socket.off('message:created', handleMessageCreated);
    socket.off('message:failed', handleMessageFailed);
  };
}, [socket, isConnected, channelId, messageStatuses, localMessages]);
```

### 2. State Dependencies
The effect MUST include these dependencies:
- `socket` - Socket instance
- `isConnected` - Connection status
- `channelId` - Current channel
- `messageStatuses` - Current message statuses
- `localMessages` - Local message state

Omitting any of these dependencies will cause stale closures and message status bugs.

## UI Status Indicators

```typescript
{message.userId === userId && (
  <>
    {status === 'sending' && (
      <span className="flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Sending
      </span>
    )}
    {status === 'sent' && <CheckIcon className="h-3 w-3" />}
    {status === 'delivered' && <CheckCheckIcon className="h-3 w-3" />}
  </>
)}
```

## Common Issues and Solutions

### 1. Pending Messages
If messages stay in "sending" state:
- Check socket connection status
- Verify event handler dependencies
- Ensure server is emitting correct events

### 2. Missing Status Updates
If status updates aren't showing:
- Check messageStatuses dependency in useEffect
- Verify tempId matching in handlers
- Ensure UI is using correct message ID for status lookup

### 3. Duplicate Messages
If messages appear twice:
- Check message deduplication in combined messages logic
- Verify message replacement in handleMessageCreated
- Ensure proper cleanup of temporary messages

## Testing Checklist

1. Message Sending:
   - [ ] Temporary message appears immediately
   - [ ] Shows sending indicator
   - [ ] Input cleared after sending

2. Message Delivery:
   - [ ] Status updates to delivered
   - [ ] Temporary message replaced with confirmed message
   - [ ] No duplicate messages

3. Error Handling:
   - [ ] Failed messages removed from UI
   - [ ] Error toast shown
   - [ ] Can retry sending message 