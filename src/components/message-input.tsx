'use client';

import { useState, useRef, useEffect } from 'react';
import { SendHorizontal } from 'lucide-react';
import { useSocket } from '@/providers/socket-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/axios';
import { Send } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';

interface MessageInputProps {
  channelId: string;
  onMessageSent?: () => void;
}

export function MessageInput({ channelId, onMessageSent }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { socket } = useSocket();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [isLoading, setIsLoading] = useState(false);

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket?.emit('channel:typing', channelId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit('channel:stop_typing', channelId);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || !socket) return;

    try {
      setIsLoading(true);
      
      // Emit message through socket
      socket.emit('message:send', {
        channelId,
        content: content.trim()
      });

      // Clear input immediately
      setContent('');
      
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="px-4 py-3 bg-white border-t">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-white text-gray-900 border-gray-200"
        />
        <Button 
          type="submit" 
          size="icon"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={isLoading || !content.trim()}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
} 