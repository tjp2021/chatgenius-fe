'use client';

import { useState, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useAuth } from '@clerk/nextjs';
import { Loader2, MessageSquare } from 'lucide-react';
import { useThread } from '@/hooks/use-thread';
import { useThreadStore } from '@/hooks/use-thread-store';
import { useThreadSocket } from '@/hooks/useThreadSocket';
import { Thread, ThreadReply } from '@/types/thread';
import { cn } from '@/lib/utils';

export function ThreadView() {
  const [replyContent, setReplyContent] = useState('');
  const { user } = useUser();
  const { userId } = useAuth();
  const { handleAddReply } = useThread();
  const { activeThread, isLoading } = useThreadStore();

  // Initialize socket connection for thread
  const { sendReply } = useThreadSocket(
    activeThread?.id || '',
    activeThread?.channelId || ''
  );

  const handleSubmitReply = useCallback(async () => {
    if (!activeThread?.id || !replyContent?.trim() || !user) return;

    try {
      // Send reply through socket
      await sendReply(replyContent.trim());
      setReplyContent('');
    } catch (error) {
      console.error('Failed to add reply:', error);
    }
  }, [activeThread?.id, replyContent, user, sendReply]);

  // Filter out empty messages, deduplicate by ID, and sort remaining messages
  const messages = useMemo(() => {
    if (!activeThread) return [];
    
    // Create a Map to store unique messages by ID
    const uniqueMessages = new Map();
    
    // Process replies and keep only the latest version of each message
    (activeThread.replies || [])
      .filter((reply: ThreadReply) => reply?.content?.trim() !== '')
      .forEach((reply: ThreadReply) => {
        uniqueMessages.set(reply.id, reply);
      });
    
    // Convert back to array and sort
    return Array.from(uniqueMessages.values())
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [activeThread]);

  if (!activeThread) return null;

  const replyCount = messages.length;

  return (
    <div className="flex flex-col h-full relative border-l">
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-4">
        {/* Thread header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Thread
            </div>
          </div>
          {replyCount > 0 && (
            <div className="text-xs bg-gray-100 px-2 py-1 rounded-full">
              {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </div>
          )}
        </div>

        {/* Parent message */}
        {activeThread.parentMessage && (
          <div className="mb-6">
            <div className="text-sm font-medium mb-1 flex items-center gap-2">
              {activeThread.parentMessage.user?.name || 'Unknown User'}
              <span className="text-xs text-gray-500">
                {activeThread.parentMessage.createdAt ? (
                  <>
                    {new Date(activeThread.parentMessage.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                    {' '}
                    {new Date(activeThread.parentMessage.createdAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: 'numeric',
                      hour12: true
                    })}
                  </>
                ) : 'No date available'}
              </span>
            </div>
            <div className="bg-gray-100 rounded-lg p-3 whitespace-pre-wrap break-words">
              {activeThread.parentMessage.content}
            </div>
          </div>
        )}

        {/* Thread replies */}
        <div className="space-y-4">
          {messages.map((message) => (
            <div 
              key={`${message.id}-${message.createdAt}`} 
              className="flex flex-col pl-4 border-l-2 border-gray-200"
            >
              <div className="flex flex-col">
                <div className="text-sm font-medium mb-1 flex items-center gap-2">
                  {message.user?.name || 'Unknown User'}
                  <span className="text-xs text-gray-500">
                    {message.createdAt ? (
                      <>
                        {new Date(message.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                        {' '}
                        {new Date(message.createdAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: 'numeric',
                          hour12: true
                        })}
                      </>
                    ) : 'No date available'}
                  </span>
                </div>
                <div className={cn(
                  "px-4 py-2 rounded-lg",
                  message.userId === userId 
                    ? "bg-green-100 text-black" 
                    : "bg-gray-100 text-gray-900"
                )}>
                  {message.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reply input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Reply to thread..."
            className="flex-1 rounded-lg border p-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitReply();
              }
            }}
          />
          <button
            onClick={handleSubmitReply}
            disabled={!replyContent.trim()}
            className={cn(
              "px-4 py-2 rounded-lg",
              "bg-blue-500 text-white",
              "hover:bg-blue-600",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  );
} 