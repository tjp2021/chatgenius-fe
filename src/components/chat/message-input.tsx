'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/ui/icons';
import { useSocketMessages } from '@/hooks/use-socket-messages';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileUpload } from '@/components/file/file-upload';

interface MessageInputProps {
  channelId: string;
  className?: string;
}

export function MessageInput({ channelId, className }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const { sendMessage } = useSocketMessages(channelId);

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  }, [isTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      if (isTyping) {
        setIsTyping(false);
      }

      await sendMessage(content);
      setContent('');
      textareaRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }} 
        className="flex gap-2 p-4 border-t"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsUploadOpen(true)}
          className="flex-shrink-0"
        >
          <Icons.paperclip className="h-5 w-5" />
        </Button>
        
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            const newContent = e.target.value;
            setContent(newContent);
            if (newContent.trim()) {
              handleTyping();
            }
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (isTyping) {
              setIsTyping(false);
            }
          }}
          placeholder="Type a message..."
          className="min-h-[60px] resize-none"
          aria-label="Message input"
        />
        <Button 
          type="submit" 
          disabled={!content.trim()}
          aria-label="Send message"
        >
          <Icons.send className="h-4 w-4" />
        </Button>
      </form>

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload PDF File</DialogTitle>
          </DialogHeader>
          <FileUpload
            onUploadComplete={(file) => {
              console.log('File uploaded:', file);
              setIsUploadOpen(false);
            }}
            onUploadError={(error) => {
              console.error('Upload error:', error);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 