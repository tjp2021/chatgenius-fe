import { ThreadMessage } from '@/stores/thread-store';

export interface ThreadEvent {
  type: 'message' | 'update' | 'delete';
  threadId: string;
  data: {
    message?: ThreadMessage;
    messageId?: string;
  };
  timestamp: number;
  version?: number;
}

interface QueuedEvent {
  event: ThreadEvent;
  timestamp: number;
}

export class EventQueue {
  private queue: QueuedEvent[] = [];
  private processing = false;
  private readonly PROCESS_DELAY = 50; // ms
  private eventHandler: (event: ThreadEvent) => Promise<void>;

  constructor(eventHandler: (event: ThreadEvent) => Promise<void>) {
    this.eventHandler = eventHandler;
  }

  enqueue(event: ThreadEvent) {
    this.queue.push({
      event,
      timestamp: Date.now()
    });

    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    if (this.processing) return;
    
    this.processing = true;

    try {
      // Wait for potential out-of-order events
      await new Promise(resolve => setTimeout(resolve, this.PROCESS_DELAY));

      // Sort by timestamp and version if available
      this.queue.sort((a, b) => {
        if (a.event.version && b.event.version) {
          return a.event.version - b.event.version;
        }
        return a.timestamp - b.timestamp;
      });

      // Process events in order
      while (this.queue.length > 0) {
        const item = this.queue.shift();
        if (item) {
          try {
            await this.eventHandler(item.event);
          } catch (error) {
            console.error('Error processing event:', error);
            // Don't break the queue on individual event errors
          }
        }
      }
    } finally {
      this.processing = false;
      
      // If new events were added while processing, process them too
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  }

  clear() {
    this.queue = [];
    this.processing = false;
  }
} 