'use client';

import { Message } from '@/types';
import { Socket } from 'socket.io-client';

// Types
interface MessageQueue {
  [key: string]: Message[];
}

interface MessageState {
  messages: Message[];
  pendingMessages: MessageQueue;
}

interface SendMessageOptions {
  content: string;
  channelId: string;
  id: string;
}

// Message State Management
export const createMessageState = (): MessageState => ({
  messages: [],
  pendingMessages: {}
});

export const queueMessage = (
  state: MessageState,
  channelId: string,
  message: Message
): MessageState => {
  const queue = state.pendingMessages[channelId] || [];
  return {
    ...state,
    pendingMessages: {
      ...state.pendingMessages,
      [channelId]: [...queue, message]
    }
  };
};

export const handleMessageDelivery = (
  state: MessageState,
  channelId: string,
  messageId: string
): MessageState => {
  const queue = state.pendingMessages[channelId] || [];
  const updatedQueue = queue.filter(msg => msg.id !== messageId);

  return {
    ...state,
    pendingMessages: {
      ...state.pendingMessages,
      [channelId]: updatedQueue
    }
  };
};

export const handleMessageFailure = (
  state: MessageState,
  channelId: string,
  messageId: string
): MessageState => {
  const queue = state.pendingMessages[channelId] || [];
  const updatedQueue = queue.map(msg =>
    msg.id === messageId ? { ...msg, isFailed: true } : msg
  );

  return {
    ...state,
    pendingMessages: {
      ...state.pendingMessages,
      [channelId]: updatedQueue
    }
  };
};

// Message Sending
export const sendMessage = async (
  socket: Socket,
  options: SendMessageOptions,
  maxAttempts = 3
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('Socket not connected'));
      return;
    }

    const attempt = async (attemptNumber: number) => {
      try {
        socket.emit('message:send', options);

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Message send timeout'));
          }, 5000);
        });

        const messagePromise = new Promise<void>((resolve) => {
          const handleSent = () => {
            socket.off('message:sent', handleSent);
            resolve();
          };
          socket.on('message:sent', handleSent);
        });

        await Promise.race([messagePromise, timeoutPromise]);
        resolve();
      } catch (error) {
        if (attemptNumber < maxAttempts) {
          // Exponential backoff
          const delay = Math.pow(2, attemptNumber) * 1000;
          setTimeout(() => attempt(attemptNumber + 1), delay);
        } else {
          reject(new Error(`Failed after ${maxAttempts} attempts`));
        }
      }
    };

    attempt(0);
  });
};

export const getPendingMessages = (
  state: MessageState,
  channelId: string
): Message[] => {
  return state.pendingMessages[channelId] || [];
};

export const clearPendingMessages = (
  state: MessageState,
  channelId: string
): MessageState => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [channelId]: removed, ...rest } = state.pendingMessages;
  return {
    ...state,
    pendingMessages: rest
  };
}; 