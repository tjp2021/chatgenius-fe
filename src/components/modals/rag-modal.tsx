'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SearchInput } from '@/components/search/search-input';
import { RagResults } from '@/components/search/rag-results';
import { RAGResponse, ragSearch } from '@/api/search';
import { Brain, MessageSquare, Search, Zap, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RagModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AI_CAPABILITIES = [
  {
    icon: MessageSquare,
    title: "Channel Context",
    description: "Ask about messages and conversations from any channel"
  },
  {
    icon: Search,
    title: "Smart Search",
    description: "Find specific information across all messages"
  },
  {
    icon: Zap,
    title: "Quick Answers",
    description: "Get instant answers about your workspace"
  }
];

export function RagModal({ isOpen, onClose }: RagModalProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RAGResponse | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Clear state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResult(undefined);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.trim()) {
      setQuery(searchQuery);
      handleSend(searchQuery);
    }
  };

  const handleSend = async (searchQuery?: string) => {
    const queryToSend = searchQuery || query;
    if (!queryToSend.trim() || isLoading) return;

    setResult(undefined);
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await ragSearch({
        query: queryToSend.trim(),
        format: 'markdown',
        maxTokens: 500
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Brain className="h-6 w-6" />
            AI Assistant
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Input Section */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Ask me anything about your messages and channels
            </p>
            <div className="flex gap-2">
              <SearchInput 
                searchType="rag"
                onSearch={handleSearch}
                className="w-full"
              />
              <Button 
                onClick={() => handleSend()}
                disabled={!query.trim() || isLoading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Capabilities Section */}
          {!result && !isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
              {AI_CAPABILITIES.map((capability) => (
                <div 
                  key={capability.title}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <capability.icon className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">{capability.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {capability.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 text-sm text-red-500 bg-red-50 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="relative">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="absolute inset-0 h-8 w-8 animate-ping rounded-full bg-primary/20" />
              </div>
              <p className="text-sm text-muted-foreground">Thinking...</p>
            </div>
          )}

          {/* Results Section */}
          {!isLoading && (
            <div className="min-h-[200px]">
              <RagResults 
                result={result}
                isLoading={false}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 