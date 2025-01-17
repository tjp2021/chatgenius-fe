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
import { RAGService } from '@/services/rag';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@clerk/nextjs';

interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: {
    messageId: string;
    channelId: string;
    userId: string;
    timestamp: number;
    replyToId?: string;
    threadId?: string;
    chunkIndex?: number;
  };
  vector?: number[];
}

interface MessageInputProps {
  channelId: string;
  className?: string;
}

interface RAGState {
  answer: string | null;
  context: SearchResult[];
  isLoading: boolean;
  metadata?: {
    processingTime: number;
    tokensUsed: number;
    model: string;
    contextSize: number;
  };
}

export function MessageInput({ channelId, className }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isRAGEnabled, setIsRAGEnabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ragState, setRagState] = useState<RAGState>({
    answer: null,
    context: [],
    isLoading: false
  });
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const ragTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const { userId } = useAuth();

  const { sendMessage } = useSocketMessages(channelId);

  const handleTyping = useCallback(async () => {
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
    if (isRAGEnabled && content.trim().length > 10 && userId) {
      if (ragTimeoutRef.current) {
        clearTimeout(ragTimeoutRef.current);
      }

      ragTimeoutRef.current = setTimeout(async () => {
        try {
          console.log('RAG: Starting request...', { content, channelId, userId });
          setRagState(prev => ({ ...prev, isLoading: true }));
          const response = await RAGService.getResponse(content, channelId, userId);
          console.log('RAG: Got response:', response);
          setRagState({
            answer: response.answer,
            context: response.context.messages.map(msg => ({
              id: msg.id,
              content: msg.content,
              score: msg.score,
              metadata: {
                messageId: msg.id,
                channelId: msg.channelId,
                userId: msg.userId,
                timestamp: Date.now()
              }
            })),
            isLoading: false,
            metadata: response.metadata
          });
          console.log('RAG: Updated state:', ragState);
        } catch (error) {
          console.error('RAG: Failed to get response:', error);
          setRagState({
            answer: null,
            context: [],
            isLoading: false
          });
          
          if (error instanceof Error && error.message.includes('RATE_LIMITED')) {
            toast({
              title: 'Rate Limited',
              description: 'Please wait a moment before trying again.',
              variant: 'destructive'
            });
          }
        }
      }, 500);
    } else {
      setRagState({
        answer: null,
        context: [],
        isLoading: false
      });
    }
  }, [isTyping, content, channelId, isRAGEnabled, userId, toast]);

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

  // Add effect to reset state on channel change
  useEffect(() => {
    setContent('');
    setIsRAGEnabled(false);
    setRagState({
      answer: null,
      context: [] as SearchResult[],
      isLoading: false
    });
  }, [channelId]);

  const handleSubmit = async () => {
    if (!content.trim() || isProcessing || !userId) return;

    try {
      setIsProcessing(true);

      // If RAG is enabled, just get and display the response
      if (isRAGEnabled) {
        const response = await RAGService.getResponse(content, channelId, userId);
        setRagState({
          answer: response.response,
          context: [],
          isLoading: false
        });
      } else {
        // Normal message send
        await sendMessage(content);
        setContent('');
      }
    } catch (error) {
      console.error('Failed:', error);
      toast({
        title: 'Error',
        description: isRAGEnabled ? 'Failed to get AI response' : 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("flex flex-col", className)}>
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
          disabled={!userId}
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
          placeholder={isRAGEnabled ? "Ask a question and we will find you relevant messages to your query" : "Type a message..."}
          className="min-h-[60px] resize-none"
          aria-label="Message input"
          disabled={isProcessing}
        />
        <Button 
          type="submit" 
          disabled={!content.trim() || isProcessing || !userId}
          aria-label="Send message"
        >
          {isProcessing ? (
            <Icons.loader className="h-4 w-4 animate-spin" />
          ) : (
            <Icons.send className="h-4 w-4" />
          )}
        </Button>
      </form>

      {/* RAG Context Display */}
      {isRAGEnabled && userId && (
        <div className="px-4 pb-4 space-y-3">
          {ragState.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icons.loader className="h-4 w-4 animate-spin" />
              <span>Analyzing conversation context...</span>
            </div>
          ) : ragState.answer ? (
            <div className="space-y-4">
              {/* AI Answer */}
              <div className="bg-primary/5 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Icons.brain className="h-5 w-5 text-primary mt-1" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">AI Response</p>
                    <p className="text-sm text-muted-foreground">{ragState.answer}</p>
                    {ragState.metadata && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Generated in {(ragState.metadata.processingTime / 1000).toFixed(1)}s using {ragState.metadata.model}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Relevant Context */}
              {ragState.context.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Based on these messages:</p>
                  <div className="space-y-2">
                    {ragState.context.map((msg, i) => (
                      <div 
                        key={msg.id} 
                        className="text-sm bg-muted/50 rounded-md p-3 space-y-1"
                      >
                        <p className="text-muted-foreground">{msg.content}</p>
                        <p className="text-xs text-muted-foreground">
                          Relevance: {(msg.score * 100).toFixed(0)}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

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