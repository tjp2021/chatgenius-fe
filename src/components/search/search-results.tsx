'use client';

import { MessageContent } from '@/api/search';

interface SearchResultsProps {
  results: MessageContent[];
  isLoading?: boolean;
}

export function SearchResults({ results, isLoading }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No results found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <div 
          key={result.id}
          className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium">{result.user.name}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(result.metadata.timestamp).toLocaleString()}
            </span>
          </div>
          <p className="text-sm">{result.content}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Score: {Math.round(result.score * 100)}%</span>
            {result.thread && (
              <span>• {result.thread.replyCount} replies</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 