'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Message } from '@/types/message';
import { Reaction, MessageEvent } from '@/types/reaction';
import { reactionApi } from '@/api/reactions';
import { ReactionButton } from './reaction-button';
import { EmojiPicker } from './emoji-picker';

interface MessageReactionsProps {
  message: Message;
  currentUserId: string;
}

export function MessageReactions({ message, currentUserId }: MessageReactionsProps) {
  const [reactions, setReactions] = useState<Reaction[]>(message.reactions || []);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleReactionAdded = (reaction: Reaction) => {
      if (reaction.messageId === message.id) {
        setReactions((prev) => [...prev, reaction]);
      }
    };

    const handleReactionRemoved = (data: { messageId: string; emoji: string; userId: string }) => {
      if (data.messageId === message.id) {
        setReactions((prev) =>
          prev.filter(
            (r) => !(r.userId === data.userId && r.emoji === data.emoji)
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
      setShowEmojiPicker(false);
      const reaction = await reactionApi.add(message.id, emoji);
      socket?.emit(MessageEvent.REACTION_ADDED, reaction);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleRemoveReaction = async (emoji: string) => {
    try {
      await reactionApi.remove(message.id, emoji);
      socket?.emit(MessageEvent.REACTION_REMOVED, {
        messageId: message.id,
        emoji,
        userId: currentUserId,
      });
    } catch (error) {
      console.error('Failed to remove reaction:', error);
    }
  };

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    acc[reaction.emoji] = acc[reaction.emoji] || [];
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, Reaction[]>);

  return (
    <div className="relative flex flex-wrap gap-1 mt-1">
      {Object.entries(groupedReactions).map(([emoji, reactions]) => (
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