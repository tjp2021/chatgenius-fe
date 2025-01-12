'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Message } from '@/types/message';
import { Reaction, MessageEvent } from '@/types/reaction';
import { reactionApi } from '@/api/reactions';
import { ReactionButton } from './reaction-button';
import { EmojiPicker } from './emoji-picker';
import { useAuth } from '@clerk/nextjs';
import { toast } from '@/components/ui/use-toast';

interface MessageReactionsProps {
  message: Message;
  currentUserId: string;
}

export function MessageReactions({ message, currentUserId }: MessageReactionsProps) {
  // Map initial reactions to ensure they have the emoji field
  const initialReactions = (message.reactions || []).map(reaction => ({
    ...reaction,
    emoji: (reaction as any).type || reaction.emoji // Handle incoming type field
  }));
  
  const [reactions, setReactions] = useState<Reaction[]>(initialReactions);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { socket, isConnected } = useSocket();
  const { getToken } = useAuth();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleReactionAdded = (incomingReaction: any) => {
      if (incomingReaction.messageId === message.id) {
        setReactions((prev) => {
          // Prevent duplicate reactions and ensure emoji field
          const exists = prev.some(r => 
            r.userId === incomingReaction.userId && 
            r.emoji === (incomingReaction.type || incomingReaction.emoji)
          );
          if (exists) return prev;
          
          const reaction: Reaction = {
            ...incomingReaction,
            emoji: incomingReaction.type || incomingReaction.emoji,
            createdAt: new Date(incomingReaction.createdAt)
          };
          return [...prev, reaction];
        });
      }
    };

    const handleReactionRemoved = (data: { messageId: string; type?: string; emoji?: string; userId: string }) => {
      if (data.messageId === message.id) {
        setReactions((prev) =>
          prev.filter(
            (r) => !(r.userId === data.userId && r.emoji === (data.type || data.emoji))
          )
        );
      }
    };

    socket.on(MessageEvent.REACTION_ADDED, handleReactionAdded);
    socket.on(MessageEvent.REACTION_REMOVED, handleReactionRemoved);

    return () => {
      socket.off(MessageEvent.REACTION_ADDED, handleReactionAdded);
      socket.off(MessageEvent.REACTION_REMOVED, handleReactionRemoved);
    };
  }, [socket, isConnected, message.id]);

  const handleAddReaction = async (emoji: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      setShowEmojiPicker(false); // Close picker immediately after selection

      // Check if user already reacted with this emoji
      const hasReacted = reactions.some(
        r => r.userId === currentUserId && r.emoji === emoji
      );
      if (hasReacted) return;

      // Optimistic update
      const optimisticReaction: Reaction = {
        id: 'temp-' + Date.now(),
        emoji: emoji,
        messageId: message.id,
        userId: currentUserId,
        user: {
          id: currentUserId,
          name: 'You',
          imageUrl: ''
        },
        createdAt: new Date()
      };
      setReactions(prev => [...prev, optimisticReaction]);

      // Make API call
      const reaction = await reactionApi.add(message.id, emoji, token);
      
      // Update with real data
      setReactions(prev => 
        prev.map(r => r.id === optimisticReaction.id ? {
          ...reaction,
          emoji: emoji // Ensure we keep the emoji from our optimistic update
        } : r)
      );
      
      socket?.emit(MessageEvent.REACTION_ADDED, {
        ...reaction,
        emoji: emoji // Ensure we send the correct emoji in the socket event
      });
    } catch (error) {
      // Revert optimistic update on error
      setReactions(prev => prev.filter(r => r.id !== 'temp-' + Date.now()));
      console.error('Failed to add reaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to add reaction',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveReaction = async (emoji: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      // Optimistic removal
      setReactions(prev => 
        prev.filter(r => !(r.userId === currentUserId && r.emoji === emoji))
      );

      await reactionApi.remove(message.id, emoji, token);
      socket?.emit(MessageEvent.REACTION_REMOVED, {
        messageId: message.id,
        emoji,
        userId: currentUserId,
      });
    } catch (error) {
      // Revert on error
      console.error('Failed to remove reaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove reaction',
        variant: 'destructive'
      });
    }
  };

  // Group reactions by emoji and sort by count
  const groupedReactions = Object.entries(
    reactions.reduce((acc, reaction) => {
      acc[reaction.emoji] = acc[reaction.emoji] || [];
      acc[reaction.emoji].push(reaction);
      return acc;
    }, {} as Record<string, Reaction[]>)
  ).sort((a, b) => b[1].length - a[1].length); // Sort by count, most reactions first

  return (
    <div className="relative flex flex-wrap gap-1 mt-1">
      <div className="flex flex-wrap gap-1">
        {groupedReactions.map(([emoji, reactions]) => (
          <ReactionButton
            key={emoji}
            emoji={emoji}
            count={reactions.length}
            hasReacted={reactions.some(r => r.userId === currentUserId)}
            onToggle={() => {
              const hasReacted = reactions.some(r => r.userId === currentUserId);
              if (hasReacted) {
                handleRemoveReaction(emoji);
              } else {
                handleAddReaction(emoji);
              }
            }}
          />
        ))}
      </div>

      <button
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
      >
        <svg 
          className="w-4 h-4 text-gray-500" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      </button>

      {showEmojiPicker && (
        <EmojiPicker
          onSelect={handleAddReaction}
          onClickOutside={() => setShowEmojiPicker(false)}
        />
      )}
    </div>
  );
} 