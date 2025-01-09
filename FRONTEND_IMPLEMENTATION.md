# Frontend Implementation Guide - Real-time Messaging System

This guide provides comprehensive documentation for implementing the frontend components of our real-time messaging system.

## Table of Contents
1. [Connection Setup](#1-connection-setup)
2. [Message Events Interface](#2-message-events-interface)
3. [React Hook Implementation](#3-react-hook-implementation)
4. [Message Component Implementation](#4-message-component-implementation)
5. [Error Handling](#5-error-handling)
6. [Offline Support](#6-offline-support)
7. [Testing Guide](#7-testing-guide)
8. [Security Considerations](#8-security-considerations)

## 1. Connection Setup

Initialize the Socket.IO connection with proper authentication:

```typescript
// socketService.ts
import { io, Socket } from 'socket.io-client';
import { MessageEvent, MessageDeliveryStatus } from './types';

export const initializeSocket = (userId: string, authToken: string): Socket => {
  return io(process.env.SOCKET_URL!, {
    auth: {
      userId,
      token: authToken
    },
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
};
```

## 2. Message Events Interface

Define TypeScript interfaces and enums for message handling:

```typescript
// types.ts
export enum MessageEvent {
  // Sending/receiving messages
  SEND = 'message:send',
  NEW = 'message:new',
  SENT = 'message:sent',
  
  // Typing indicators
  TYPING_START = 'message:typing:start',
  TYPING_STOP = 'message:typing:stop',
  
  // Delivery status
  DELIVERED = 'message:delivered',
  READ = 'message:read',
  
  // Error events
  ERROR = 'message:error'
}

export enum MessageDeliveryStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

export interface Message {
  id: string;
  content: string;
  channelId: string;
  userId: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  deliveryStatus: MessageDeliveryStatus;
  user: {
    id: string;
    name: string;
  }
}
```

## 3. React Hook Implementation

Create a custom hook for message handling:

```typescript
// useMessageHandling.ts
import { useEffect, useCallback, useState } from 'react';
import { debounce } from 'lodash';
import { useSocket } from './useSocket';
import { Message, MessageEvent, MessageDeliveryStatus } from './types';

export function useMessageHandling(channelId: string) {
  const socket = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  
  // Message sending
  const sendMessage = useCallback((content: string, parentId?: string) => {
    socket.emit(MessageEvent.SEND, {
      content,
      channelId,
      parentId,
      deliveryStatus: MessageDeliveryStatus.SENT
    });
  }, [socket, channelId]);

  // Typing indicator
  const debouncedTyping = useCallback(
    debounce((isTyping: boolean) => {
      socket.emit(
        isTyping ? MessageEvent.TYPING_START : MessageEvent.TYPING_STOP,
        { channelId, isTyping }
      );
    }, 300),
    [socket, channelId]
  );

  // Message handlers
  useEffect(() => {
    if (!socket || !channelId) return;

    // New message handler
    const handleNewMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
      // Mark as delivered
      socket.emit(MessageEvent.DELIVERED, {
        messageId: message.id,
        channelId: message.channelId,
        status: MessageDeliveryStatus.DELIVERED
      });
    };

    // Typing indicator handlers
    const handleTypingStart = ({ userId }: { userId: string }) => {
      setTypingUsers(prev => new Set(prev).add(userId));
    };

    const handleTypingStop = ({ userId }: { userId: string }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    // Setup event listeners
    socket.on(MessageEvent.NEW, handleNewMessage);
    socket.on(MessageEvent.TYPING_START, handleTypingStart);
    socket.on(MessageEvent.TYPING_STOP, handleTypingStop);

    // Cleanup
    return () => {
      socket.off(MessageEvent.NEW);
      socket.off(MessageEvent.TYPING_START);
      socket.off(MessageEvent.TYPING_STOP);
    };
  }, [socket, channelId]);

  return {
    messages,
    sendMessage,
    updateTyping: debouncedTyping,
    typingUsers: Array.from(typingUsers)
  };
}
```

## 4. Message Component Implementation

Implement the message list and input components:

```typescript
// MessageList.tsx
import React, { useEffect, useRef } from 'react';
import { useMessageHandling } from './useMessageHandling';

export const MessageList: React.FC<{ channelId: string }> = ({ channelId }) => {
  const {
    messages,
    sendMessage,
    updateTyping,
    typingUsers
  } = useMessageHandling(channelId);
  
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto">
        {messages.map(message => (
          <MessageItem key={message.id} message={message} />
        ))}
        <div ref={messageEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="text-sm text-gray-500 italic">
          {typingUsers.length === 1
            ? `${typingUsers[0]} is typing...`
            : `${typingUsers.length} people are typing...`}
        </div>
      )}

      {/* Message input */}
      <MessageInput
        onSend={sendMessage}
        onTyping={updateTyping}
      />
    </div>
  );
};

// MessageInput.tsx
export const MessageInput: React.FC<{
  onSend: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
}> = ({ onSend, onTyping }) => {
  const [content, setContent] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onTyping(true);
  };

  const handleSend = () => {
    if (content.trim()) {
      onSend(content);
      setContent('');
      onTyping(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-4 border-t">
      <textarea
        value={content}
        onChange={handleChange}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Type a message..."
        className="flex-1 resize-none rounded-lg p-2"
      />
      <button
        onClick={handleSend}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg"
      >
        Send
      </button>
    </div>
  );
};
```

## 5. Error Handling

Implement robust error handling:

```typescript
// errorHandling.ts
export const handleSocketError = (error: any) => {
  if (error.message === 'Unauthorized') {
    // Handle authentication errors
    redirectToLogin();
  } else if (error.message === 'Rate limit exceeded') {
    // Handle rate limiting
    showNotification('Please slow down...');
  } else {
    // Handle other errors
    console.error('Socket error:', error);
    showNotification('An error occurred. Please try again.');
  }
};

// Usage in components
socket.on('error', handleSocketError);
```

## 6. Offline Support

Implement offline message handling:

```typescript
// offlineSupport.ts
export const handleOfflineMessage = (message: Message) => {
  const offlineMessages = JSON.parse(
    localStorage.getItem('offlineMessages') || '[]'
  );
  
  offlineMessages.push({
    ...message,
    status: MessageDeliveryStatus.FAILED
  });
  
  localStorage.setItem('offlineMessages', JSON.stringify(offlineMessages));
};

// Retry failed messages on reconnection
socket.on('connect', () => {
  const offlineMessages = JSON.parse(
    localStorage.getItem('offlineMessages') || '[]'
  );
  
  offlineMessages.forEach(message => {
    socket.emit(MessageEvent.SEND, message);
  });
  
  localStorage.removeItem('offlineMessages');
});
```

## 7. Testing Guide

Example test cases for the messaging components:

```typescript
// MessageList.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MessageList } from './MessageList';

describe('MessageList', () => {
  it('should display new messages', async () => {
    const { getByText } = render(<MessageList channelId="test-channel" />);
    
    // Simulate receiving a new message
    socket.emit(MessageEvent.NEW, {
      id: '1',
      content: 'Test message',
      // ... other message fields
    });

    await waitFor(() => {
      expect(getByText('Test message')).toBeInTheDocument();
    });
  });

  it('should show typing indicator', async () => {
    const { getByText } = render(<MessageList channelId="test-channel" />);
    
    // Simulate typing indicator
    socket.emit(MessageEvent.TYPING_START, {
      userId: 'user1',
      channelId: 'test-channel'
    });

    await waitFor(() => {
      expect(getByText('user1 is typing...')).toBeInTheDocument();
    });
  });
});
```

## 8. Security Considerations

Important security measures to implement:

1. **Authentication**:
   - Always include authentication token in socket connection
   - Validate token expiration
   - Handle unauthorized errors appropriately

2. **Data Validation**:
   ```typescript
   // messageValidation.ts
   import { z } from 'zod';

   export const MessageSchema = z.object({
     content: z.string().min(1).max(2000),
     channelId: z.string().uuid(),
     parentId: z.string().uuid().optional()
   });

   // Validate before sending
   const validateMessage = (data: unknown) => {
     return MessageSchema.parse(data);
   };
   ```

3. **XSS Prevention**:
   ```typescript
   import DOMPurify from 'dompurify';

   const sanitizeMessage = (content: string): string => {
     return DOMPurify.sanitize(content);
   };
   ```

4. **Rate Limiting**:
   - Implement client-side throttling for message sending
   - Handle rate limit errors from server
   - Show appropriate feedback to users

## Best Practices

1. Always clean up socket listeners in useEffect cleanup functions
2. Implement proper error handling for all socket events
3. Use TypeScript for better type safety
4. Implement retry mechanisms for failed messages
5. Use proper loading and error states in UI
6. Implement proper validation before sending messages
7. Handle reconnection scenarios gracefully
8. Use proper security measures for sensitive data 