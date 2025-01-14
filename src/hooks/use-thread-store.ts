import { create } from 'zustand';
import { Thread, ThreadReply } from '@/types/thread';
import { threadApi } from '@/lib/api/threads';

interface ThreadStore {
  activeThread: (Thread & { 
    replies?: ThreadReply[];
    parentMessage?: {
      id: string;
      content: string;
      createdAt: string;
      user: {
        id: string;
        name: string;
        imageUrl?: string;
      };
    };
  }) | null;
  isLoading: boolean;
  error: Error | null;
  setActiveThread: (thread: Thread | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  addReply: (reply: ThreadReply) => void;
}

export const useThreadStore = create<ThreadStore>((set, get) => ({
  activeThread: null,
  isLoading: false,
  error: null,
  setActiveThread: (thread) => {
    if (!thread) {
      set({ activeThread: null });
      return;
    }

    // Get current state
    const currentState = get();
    const currentThread = currentState.activeThread;
    const threadWithReplies = thread as ThreadStore['activeThread'];

    // If it's the same thread, preserve existing replies and merge with new ones
    if (currentThread && currentThread.id === thread.id) {
      const existingReplies = currentThread.replies || [];
      const newReplies = threadWithReplies?.replies || [];

      // Create a Map to deduplicate replies by ID
      const repliesMap = new Map();
      [...existingReplies, ...newReplies].forEach(reply => {
        repliesMap.set(reply.id, reply);
      });

      // Convert Map back to array and sort by createdAt
      const mergedReplies = Array.from(repliesMap.values())
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      set({
        activeThread: {
          ...thread,
          parentMessage: thread.parentMessage || currentThread.parentMessage,
          replies: mergedReplies
        }
      });
    } else {
      // If it's a different thread, use the new thread's replies or initialize to empty array
      set({
        activeThread: {
          ...thread,
          parentMessage: threadWithReplies?.parentMessage,
          replies: threadWithReplies?.replies || []
        }
      });
    }
  },
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  addReply: (reply) => set((state) => ({
    activeThread: state.activeThread ? {
      ...state.activeThread,
      replies: [
        ...(state.activeThread.replies || []),
        {
          ...reply,
          content: reply.content || '',
          createdAt: reply.createdAt || new Date().toISOString(),
          user: reply.user || {
            id: '',
            name: 'Unknown User'
          }
        }
      ]
    } : null
  }))
})); 