# Message System Debugging Guide

## Debug Logging Points

### 1. Socket Connection Status
```typescript
console.log('CRITICAL - Socket/Channel status:', {
  hasSocket: !!socket,
  isConnected,
  channelId,
  socketId: socket?.getSocketId?.(),
  messageCount: messages.length,
  currentMessageStatuses: messageStatuses
});
```

### 2. Message Send Flow
```typescript
console.log('[Send] ====== STARTING MESSAGE SEND FLOW ======');
console.log('[Send] Initial state:', {
  hasSocket: !!socket,
  messageContent: newMessage,
  isMessageEmpty: !newMessage.trim(),
  socketConnected: socket?.isConnected(),
  channelId,
  userId
});
```

### 3. Event Handler Logging
```typescript
// Message Delivered
console.log('CRITICAL - message:delivered received:', {
  payload,
  currentStatuses: messageStatuses,
  willUpdate: payload.tempId
});

// Message Created
console.log('CRITICAL - message:created received:', {
  payload,
  currentStatuses: messageStatuses,
  currentMessages: localMessages
});
```

## Common Issues and Debug Steps

### 1. Message Stuck in "Sending" State

#### Debug Steps:
1. Check Socket Connection:
```typescript
console.log({
  socketExists: !!socket,
  isConnected: socket?.isConnected(),
  socketId: socket?.getSocketId()
});
```

2. Verify Event Registration:
```typescript
// Add at start of useEffect
console.log('CRITICAL - Registering socket event handlers');
// Add in cleanup
console.log('CRITICAL - Cleaning up socket listeners');
```

3. Check Message Status Updates:
```typescript
console.log('CRITICAL - Updating message status:', {
  prevStatuses,
  tempId,
  matchingStatus: prev.find(s => s.id === tempId)
});
```

### 2. Message Status Not Updating

#### Debug Steps:
1. Check Event Handler Dependencies:
```typescript
// Verify these are included in useEffect deps
[socket, isConnected, channelId, messageStatuses, localMessages]
```

2. Verify Status Update Logic:
```typescript
console.log('CRITICAL - Status update attempt:', {
  currentStatus: messageStatuses.find(s => s.id === tempId),
  newStatus: 'delivered',
  tempId
});
```

3. Check UI Render:
```typescript
console.log('Message render:', {
  messageId: message.id,
  status: messageStatuses.find(s => s.id === message.id)?.status
});
```

### 3. Duplicate Messages

#### Debug Steps:
1. Check Message Combination Logic:
```typescript
console.log('Message combination:', {
  historyMessages: historyMessages.length,
  localMessages: localMessages.length,
  combinedMessages: combinedMessages.length,
  messageIds: Array.from(messageIds)
});
```

2. Verify Message Replacement:
```typescript
console.log('Message replacement:', {
  removedTemp: filtered.length !== prev.length,
  addedConfirmed: payload.message.id,
  tempId: payload.tempId
});
```

## Quick Debug Commands

### 1. Check Socket State
```javascript
// Browser Console
window.__debug = {
  socket: socket,
  isConnected: socket?.isConnected(),
  messageStatuses,
  localMessages
};
```

### 2. Force Message Status Update
```javascript
// Browser Console
setMessageStatuses(prev => {
  console.log('Current statuses:', prev);
  return prev;
});
```

### 3. Check Message Deduplication
```javascript
// Browser Console
const messageIds = new Set(messages.map(m => m.id));
console.log('Duplicate check:', {
  totalMessages: messages.length,
  uniqueIds: messageIds.size,
  duplicates: messages.length - messageIds.size
});
```

## Troubleshooting Checklist

1. Socket Connection:
   - [ ] Socket instance exists
   - [ ] Socket is connected
   - [ ] Socket ID is valid
   - [ ] Channel ID is correct

2. Message Send:
   - [ ] Temporary message created
   - [ ] Initial status set to 'sending'
   - [ ] Socket emit successful
   - [ ] Server acknowledges receipt

3. Status Updates:
   - [ ] Event handlers registered
   - [ ] Dependencies up to date
   - [ ] Status updates applied
   - [ ] UI reflects changes

4. Message Cleanup:
   - [ ] Temporary messages replaced
   - [ ] No duplicate messages
   - [ ] Failed messages removed
   - [ ] Status entries cleaned up 