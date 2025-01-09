import { MessagePayload, MessageDeliveryStatus } from '@/types/message';
import { Socket } from 'socket.io-client';

export function validateMessage(message: MessagePayload): string[] {
  const required = ['content', 'channelId'];
  const missing = required.filter(field => !message[field as keyof MessagePayload]);
  return missing;
}

export async function sendWithRetry(
  socket: typeof Socket,
  message: MessagePayload,
  attempts = 0
): Promise<void> {
  const missing = validateMessage(message);
  if (missing.length) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  return new Promise((resolve, reject) => {
    try {
      socket.emit('message:send', message);

      // Wait for acknowledgment
      const timeoutId = setTimeout(() => {
        if (attempts < 3) {
          console.log(`Retrying message send attempt ${attempts + 1}`);
          // Exponential backoff
          setTimeout(() => {
            sendWithRetry(socket, message, attempts + 1)
              .then(resolve)
              .catch(reject);
          }, Math.pow(2, attempts) * 1000);
        } else {
          reject(new Error('Message send failed after 3 attempts'));
        }
      }, 5000); // 5 second timeout

      // Listen for sent confirmation
      const handleSent = (response: { messageId: string; status: MessageDeliveryStatus }) => {
        clearTimeout(timeoutId);
        socket.off('message:sent', handleSent);
        resolve();
      };

      socket.on('message:sent', handleSent);
    } catch (error) {
      reject(error);
    }
  });
}

// Store failed messages for retry
export function handleMessageError(message: MessagePayload): void {
  const offlineMessages = JSON.parse(
    localStorage.getItem('offlineMessages') || '[]'
  );
  offlineMessages.push({
    ...message,
    status: MessageDeliveryStatus.FAILED
  });
  localStorage.setItem('offlineMessages', JSON.stringify(offlineMessages));
}

// Retry failed messages
export function retryFailedMessages(socket: typeof Socket): void {
  const offlineMessages = JSON.parse(
    localStorage.getItem('offlineMessages') || '[]'
  );
  offlineMessages.forEach((message: MessagePayload) => {
    sendWithRetry(socket, message, 0).catch(console.error);
  });
  localStorage.removeItem('offlineMessages');
} 