'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchInput } from '@/components/search/search-input';
import { RagResults } from '@/components/search/rag-results';
import { BaseSearchResponse, semanticSearch } from '@/api/search';
import { Search, Loader2, Send, Globe, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@clerk/nextjs';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SEARCH_DESCRIPTIONS = {
  all: {
    icon: Globe,
    title: "Search All Messages",
    description: "Search through all messages across all channels using semantic search. Find messages based on meaning, not just exact matches."
  },
  my: {
    icon: User,
    title: "Search My Messages",
    description: "Search through your own messages across all channels. Quickly find your past conversations and contributions."
  }
};

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BaseSearchResponse | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  // Clear state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResult(undefined);
      setError(null);
      setIsLoading(false);
      setCursor(undefined);
    }
  }, [isOpen]);

  // Clear results when switching tabs
  useEffect(() => {
    setQuery('');
    setResult(undefined);
    setError(null);
    setCursor(undefined);
  }, [activeTab]);

  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.trim()) {
      setQuery(searchQuery);
      handleSend(searchQuery);
    }
  };

  const handleSend = async (searchQuery?: string, nextCursor?: string) => {
    const queryToSend = searchQuery || query;
    if (!queryToSend.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);
    
    try {
      const response = await semanticSearch({
        query: queryToSend.trim(),
        cursor: nextCursor,
        ...(activeTab === 'my' && userId ? { userId } : {})
      });

      // If it's a new search (no cursor), replace results
      // If it's pagination (has cursor), append results
      setResult(prev => 
        nextCursor && prev 
          ? {
              ...response,
              items: [...prev.items, ...response.items],
              pageInfo: response.pageInfo
            }
          : response
      );
      setCursor(response.pageInfo.cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search messages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (cursor) {
      handleSend(query, cursor);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Search className="h-6 w-6" />
            Search Messages
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'my')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All Messages</TabsTrigger>
            <TabsTrigger value="my">My Messages</TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-6">
            {/* Search Input Section */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <SearchInput 
                  searchType="semantic"
                  onSearch={handleSearch}
                  className="w-full"
                  placeholder={activeTab === 'all' 
                    ? "Search all messages..." 
                    : "Search your messages..."
                  }
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

            {/* Default View */}
            {!result && !isLoading && (
              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-full bg-primary/10">
                    {activeTab === 'all' ? (
                      <Globe className="h-6 w-6 text-primary" />
                    ) : (
                      <User className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold">{SEARCH_DESCRIPTIONS[activeTab].title}</h3>
                </div>
                <p className="text-muted-foreground">
                  {SEARCH_DESCRIPTIONS[activeTab].description}
                </p>
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
                <p className="text-sm text-muted-foreground">Searching...</p>
              </div>
            )}

            {/* Results Section */}
            {!isLoading && result && (
              <div className="space-y-4">
                <div className="space-y-4">
                  {result.items.map((item) => (
                    <div 
                      key={item.id}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.metadata.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Score: {Math.round(item.score * 100)}%
                        </span>
                      </div>
                      <p className="text-sm">{item.content}</p>
                    </div>
                  ))}
                </div>

                {/* Only show pagination section if there are more results */}
                {result.pageInfo.hasNextPage && result.pageInfo.total > result.items.length && (
                  <>
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'Load More'
                        )}
                      </Button>
                    </div>

                    {/* Only show count when there are actually more results */}
                    <div className="text-xs text-center text-muted-foreground pt-2">
                      Showing {result.items.length} of {result.pageInfo.total} results
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 