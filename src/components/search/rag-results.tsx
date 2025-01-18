'use client';

import { RAGResponse } from '@/api/search';

interface RagResultsProps {
  result?: RAGResponse;
  isLoading?: boolean;
}

export function RagResults({ result, isLoading }: RagResultsProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="p-4 rounded-lg border bg-card">
        <p className="text-sm whitespace-pre-wrap">{result.response}</p>
        <div className="mt-2 text-xs text-muted-foreground">
          Based on {result.contextMessageCount} messages • 
          Quality: {Math.round(result.metadata.contextQuality * 100)}%
        </div>
      </div>
    </div>
  );
} 