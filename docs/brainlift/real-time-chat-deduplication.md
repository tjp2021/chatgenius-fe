# Real-Time Chat Message Deduplication Pattern

## Problem
When implementing real-time chat with WebSocket/Socket.io, messages can appear multiple times in the UI due to:
- Multiple socket event emissions
- React component re-renders
- Temporary message state management
- Race conditions between optimistic updates and server responses

## Solution Pattern

### 1. Socket-Level Deduplication
```typescript
export class ChatSocketClient {
  private processedMessageIds = new Set<string>();

  onNewMessage<T>(callback: (message: T, eventType: 'new' | 'received') => void): void {
    this.socket.on('message:new', (message: any) => {
      if (!this.processedMessageIds.has(message.id)) {
        this.processedMessageIds.add(message.id);
        callback(message, 'new');
      }
    });
  }
}
```

### 2. React Component Message Handling
```typescript
function ChatWindow({ channelId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  
  useEffect(() => {
    const handleMessage = (message: Message, eventType: 'new' | 'received') => {
      if (message.channelId === channelId) {
        if (eventType === 'new') {
          setMessages(prev => {
            // Check for temporary message replacement
            const tempMessageIndex = prev.findIndex(m => 
              m.id.startsWith('temp-') && 
              m.content === message.content && 
              m.userId === message.userId
            );
            
            if (tempMessageIndex !== -1) {
              const newMessages = [...prev];
              newMessages[tempMessageIndex] = message;
              return newMessages;
            }
            
            // Check for duplicates
            const messageExists = prev.some(m => m.id === message.id);
            return messageExists ? prev : [...prev, message];
          });
        }
      }
    };

    socket.onNewMessage(handleMessage);
    return () => socket.offNewMessage(handleMessage);
  }, [socket, channelId]); // Note: messages not in dependency array
}
```

### 3. Optimistic Updates with Temporary Messages
```typescript
const handleSendMessage = async () => {
  const tempMessage = {
    id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content,
    // ... other message properties
  };
  
  // Add temporary message
  setMessages(prev => [...prev, tempMessage]);
  setMessageStatuses(prev => [...prev, { id: tempMessage.id, status: 'sending' }]);

  try {
    const response = await socket.sendMessage(channelId, content, tempMessage.id);
    
    if (response.success && response.data) {
      // Replace temp message with confirmed message
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id ? response.data! : msg
      ));
      setMessageStatuses(prev => prev.map(status => 
        status.id === tempMessage.id 
          ? { id: response.data!.id, status: 'sent' }
          : status
      ));
    }
  } catch (error) {
    // Cleanup on error
    setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
    setMessageStatuses(prev => prev.filter(status => !status.id.startsWith('temp-')));
  }
};
```

## Key Points

1. **Multi-Level Deduplication**
   - Socket level: Track processed message IDs
   - Component level: Check for existing messages
   - Temporary message handling: Replace temp messages with confirmed ones

2. **State Management**
   - Keep socket event handlers stable (minimal dependencies)
   - Use functional updates for state changes
   - Handle temporary and confirmed message states separately

3. **Error Handling**
   - Clean up temporary messages on errors
   - Restore message input on send failure
   - Show appropriate error toasts

4. **Performance Considerations**
   - Minimize React re-renders
   - Efficient message existence checks
   - Proper cleanup of socket listeners

## Common Pitfalls

1. **Dependency Arrays**
   - Including messages in useEffect dependencies causes unnecessary re-renders
   - Can lead to multiple socket listeners

2. **Message Keys**
   - Using non-unique keys for messages
   - Not handling temporary message IDs properly

3. **State Updates**
   - Direct state mutations
   - Not using functional updates
   - Race conditions between temp and confirmed messages

## Testing Checklist

1. Send multiple messages rapidly
2. Check for duplicate messages
3. Verify message status indicators
4. Test error scenarios
5. Monitor socket reconnections
6. Verify cleanup on unmount

## Related Patterns

- Optimistic Updates
- Real-Time Event Handling
- Socket Connection Management
- Message Status Tracking 