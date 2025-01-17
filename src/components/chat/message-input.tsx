'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/ui/icons';
import { useSocketMessages } from '@/hooks/use-socket-messages';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileUpload } from '@/components/file/file-upload';
import { Toggle } from '@/components/ui/toggle';

interface MessageInputProps {
  channelId: string;
  className?: string;
}

export function MessageInput({ channelId, className }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isRAGEnabled, setIsRAGEnabled] = useState(false);
  const [ragSuggestion, setRagSuggestion] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const ragTimeoutRef = useRef<NodeJS.Timeout>();

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

    // Get RAG suggestions while typing
    if (isRAGEnabled && content.trim().length > 10) {
      if (ragTimeoutRef.current) {
        clearTimeout(ragTimeoutRef.current);
      }

      ragTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch('/api/rag/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              content,
              channelId 
            })
          });

          if (response.ok) {
            const data = await response.json();
            setRagSuggestion(data.suggestion);
          }
        } catch (error) {
          console.error('Failed to get RAG suggestion:', error);
        }
      }, 500);
    }
  }, [isTyping, content, channelId, isRAGEnabled]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (ragTimeoutRef.current) {
        clearTimeout(ragTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      if (isTyping) {
        setIsTyping(false);
      }

      // If RAG is enabled, process through RAG endpoint
      if (isRAGEnabled) {
        const response = await fetch('/api/rag/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            channelId
          })
        });

        if (response.ok) {
          const data = await response.json();
          await sendMessage(data.response);
        }
      } else {
        await sendMessage(content);
      }

      setContent('');
      setRagSuggestion(null);
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
      {ragSuggestion && (
        <div className="px-4 py-2 bg-muted/50 rounded-md">
          <p className="text-sm text-muted-foreground">Suggestion: {ragSuggestion}</p>
        </div>
      )}
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

        <Toggle
          pressed={isRAGEnabled}
          onPressedChange={setIsRAGEnabled}
          className="flex-shrink-0"
          aria-label="Toggle RAG assistance"
        >
          <Icons.brain className="h-5 w-5" />
        </Toggle>
        
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
          placeholder={isRAGEnabled ? "Type a message (RAG-assisted)..." : "Type a message..."}
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