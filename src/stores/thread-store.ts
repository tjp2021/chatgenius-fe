import { create } from 'zustand';
import { StateCreator } from 'zustand';

export interface ThreadMessage {
  id: string;
  content: string;
  userId: string;
  createdAt: string;
  threadId: string;
  version?: number;
  status?: 'pending' | 'sent' | 'error';
}

interface OptimisticUpdate {
  id: string;
  type: 'add' | 'update' | 'delete';
  threadId: string;
  data: ThreadMessage;
  rollback: () => void;
}

interface ThreadState {
  messages: Map<string, ThreadMessage[]>;
  pendingMessages: Map<string, ThreadMessage>;
  pendingUpdates: Map<string, OptimisticUpdate>;
  versions: Map<string, number>; // threadId -> version number
  
  // Message operations
  addMessage: (threadId: string, message: ThreadMessage) => void;
  addPendingMessage: (threadId: string, message: ThreadMessage) => string;
  confirmMessage: (threadId: string, tempId: string, finalMessage: ThreadMessage) => void;
  removePendingMessage: (threadId: string, messageId: string) => void;
  
  // Optimistic update operations
  optimisticUpdate: (threadId: string, update: Partial<ThreadMessage>) => string;
  commitUpdate: (updateId: string) => void;
  rollbackUpdate: (updateId: string) => void;
}

export const useThreadStore = create<ThreadState>((set, get) => ({
  messages: new Map(),
  pendingMessages: new Map(),
  pendingUpdates: new Map(),
  versions: new Map(),

  addMessage: (threadId: string, message: ThreadMessage) => {
    set((state) => {
      const threadMessages = state.messages.get(threadId) || [];
      const currentVersion = state.versions.get(threadId) || 0;
      const newMessages = new Map(state.messages);
      const newVersions = new Map(state.versions);
      
      // Only add if version is newer
      if (!message.version || message.version > currentVersion) {
        newMessages.set(threadId, [...threadMessages, message]);
        if (message.version) {
          newVersions.set(threadId, message.version);
        }
        
        return {
          messages: newMessages,
          versions: newVersions
        };
      }
      
      return state;
    });
  },

  addPendingMessage: (threadId: string, message: ThreadMessage) => {
    const updateId = `${threadId}:${Date.now()}`;
    message.status = 'pending';
    
    set((state) => {
      const newPending = new Map(state.pendingMessages);
      newPending.set(message.id, message);
      
      const newUpdates = new Map(state.pendingUpdates);
      newUpdates.set(updateId, {
        id: updateId,
        type: 'add',
        threadId,
        data: message,
        rollback: () => {
          set((s) => {
            const newPending = new Map(s.pendingMessages);
            newPending.delete(message.id);
            return { pendingMessages: newPending };
          });
        }
      });
      
      return {
        pendingMessages: newPending,
        pendingUpdates: newUpdates
      };
    });
    
    return updateId;
  },

  confirmMessage: (threadId: string, tempId: string, finalMessage: ThreadMessage) => {
    set((state) => {
      // Remove from pending
      const newPending = new Map(state.pendingMessages);
      newPending.delete(tempId);

      // Add to confirmed messages with version
      const threadMessages = state.messages.get(threadId) || [];
      const currentVersion = state.versions.get(threadId) || 0;
      const newMessages = new Map(state.messages);
      const newVersions = new Map(state.versions);
      
      finalMessage.version = currentVersion + 1;
      finalMessage.status = 'sent';
      
      newMessages.set(threadId, [...threadMessages, finalMessage]);
      newVersions.set(threadId, finalMessage.version);

      return {
        messages: newMessages,
        pendingMessages: newPending,
        versions: newVersions
      };
    });
  },

  removePendingMessage: (threadId: string, messageId: string) => {
    set((state) => {
      const newPending = new Map(state.pendingMessages);
      const message = newPending.get(messageId);
      if (message) {
        message.status = 'error';
      }
      newPending.delete(messageId);
      return {
        pendingMessages: newPending
      };
    });
  },

  optimisticUpdate: (threadId: string, update: Partial<ThreadMessage>) => {
    const updateId = `${threadId}:${Date.now()}`;
    const optimisticMessage: ThreadMessage = {
      id: updateId,
      content: update.content || '',
      userId: update.userId || '',
      createdAt: new Date().toISOString(),
      threadId,
      status: 'pending',
      version: (get().versions.get(threadId) || 0) + 1
    };

    set((state) => {
      const threadMessages = state.messages.get(threadId) || [];
      const newMessages = new Map(state.messages);
      newMessages.set(threadId, [...threadMessages, optimisticMessage]);

      const newUpdates = new Map(state.pendingUpdates);
      newUpdates.set(updateId, {
        id: updateId,
        type: 'add',
        threadId,
        data: optimisticMessage,
        rollback: () => {
          set((s) => {
            const messages = s.messages.get(threadId) || [];
            const newMessages = new Map(s.messages);
            newMessages.set(
              threadId,
              messages.filter(m => m.id !== updateId)
            );
            return { messages: newMessages };
          });
        }
      });

      return {
        messages: newMessages,
        pendingUpdates: newUpdates
      };
    });

    return updateId;
  },

  commitUpdate: (updateId: string) => {
    set((state) => {
      const newUpdates = new Map(state.pendingUpdates);
      newUpdates.delete(updateId);
      return { pendingUpdates: newUpdates };
    });
  },

  rollbackUpdate: (updateId: string) => {
    const update = get().pendingUpdates.get(updateId);
    if (update) {
      update.rollback();
      set((state) => {
        const newUpdates = new Map(state.pendingUpdates);
        newUpdates.delete(updateId);
        return { pendingUpdates: newUpdates };
      });
    }
  }
})); 