import { Thread, ThreadReply } from "@/types/thread";
import { api } from "@/lib/axios";

interface ThreadResponse {
  thread: Thread;
  replies: ThreadReply[];
}

interface ThreadListResponse {
  threads: Thread[];
  nextCursor: string | null;
}

// Only implementing create for now to test the basic flow
export const createThread = async (messageId: string): Promise<Thread> => {
  const response = await api.post<Thread>('/threads', {
    messageId
  });
  return response.data;
};

// These will be implemented one by one after we verify createThread works
export const getThread = async (threadId: string): Promise<ThreadResponse> => {
  throw new Error('Not implemented');
};

export const addReply = async (threadId: string, content: string): Promise<ThreadReply> => {
  throw new Error('Not implemented');
};

export const listChannelThreads = async (
  channelId: string, 
  cursor?: string, 
  limit: number = 20
): Promise<ThreadListResponse> => {
  throw new Error('Not implemented');
};

export const deleteReply = async (replyId: string): Promise<void> => {
  throw new Error('Not implemented');
}; 