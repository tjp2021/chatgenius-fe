import { useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { threadApi } from '@/lib/api/threads';
import { useThreadStore } from './use-thread-store';
import { Thread, ThreadReply } from '@/types/thread';

export const useThread = () => {
  const { userId } = useUser();
  const { user } = useUser();
  const { setActiveThread, setLoading, setError, addReply } = useThreadStore();

  const loadReplies = useCallback(async (threadId: string) => {
    try {
      setLoading(true);
      const replies = await threadApi.getReplies(threadId);
      
      // Sort replies by creation time
      const sortedReplies = [...replies].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      return sortedReplies;
    } catch (error) {
      console.error('Failed to load replies:', error);
      setError(new Error(error instanceof Error ? error.message : 'Failed to load replies'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const createThread = useCallback(async (messageId: string, parentMessage?: {
    content: string;
    createdAt: string;
    user?: {
      id: string;
      name: string;
      imageUrl?: string;
    };
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      // CORRECT AUTH PATTERN: Use configured api client via threadApi
      const thread = await threadApi.createThread(messageId);
      
      // Add the user data to the thread if it's missing
      const threadWithUser = {
        ...thread,
        user: thread.user || {
          id: userId || '',
          name: user?.fullName || user?.username || 'Unknown User',
          imageUrl: user?.imageUrl
        }
      };
      
      // Load replies for the thread
      const replies = await loadReplies(thread.id);
      
      setActiveThread({
        ...threadWithUser,
        parentMessage: parentMessage || {
          content: threadWithUser.content,
          createdAt: threadWithUser.createdAt,
          user: threadWithUser.user
        },
        replies,
      } as Thread & { replies: ThreadReply[] });

      return threadWithUser;
    } catch (error) {
      console.error('Failed to create thread:', error);
      setError(new Error(error instanceof Error ? error.message : 'Failed to create thread'));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [userId, user, setActiveThread, setLoading, setError, loadReplies]);

  const handleAddReply = useCallback(async (threadId: string, content: string) => {
    try {
      setLoading(true);
      setError(null);

      // CORRECT AUTH PATTERN: Use configured api client via threadApi
      const reply = await threadApi.addReply(threadId, content);
      
      // Add the user data and ensure createdAt is set for the reply
      const replyWithUser = {
        ...reply,
        createdAt: reply.createdAt || new Date().toISOString(),
        user: reply.user || {
          id: userId || '',
          name: user?.fullName || user?.username || 'Unknown User',
          imageUrl: user?.imageUrl
        }
      };
      
      addReply(replyWithUser);
      return replyWithUser;
    } catch (error) {
      console.error('Failed to add reply:', error);
      setError(new Error(error instanceof Error ? error.message : 'Failed to add reply'));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, userId, user, addReply]);

  return {
    createThread,
    handleAddReply,
    loadReplies
  };
}; 