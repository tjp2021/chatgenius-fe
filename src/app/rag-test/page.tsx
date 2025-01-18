'use client';

import { useState } from 'react';
import { RagResults } from '@/components/search/rag-results';
import { SearchInput } from '@/components/search/search-input';
import { RAGResponse, ragSearch } from '@/api/search';

export default function RagTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RAGResponse | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setResult(undefined);
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await ragSearch({
        query,
        format: 'markdown',  // Support formatted text
        maxTokens: 500      // Reasonable length for responses
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">RAG Search Test</h1>
      
      <SearchInput 
        searchType="rag"
        onSearch={handleSearch}
      />

      {error && (
        <div className="p-4 text-sm text-red-500 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <RagResults 
        result={result}
        isLoading={isLoading}
      />

      <div className="mt-8 space-y-2">
        <h2 className="text-sm font-semibold">Test Controls:</h2>
        <button
          onClick={() => setIsLoading(x => !x)}
          className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded"
        >
          Toggle Loading
        </button>
        <button
          onClick={() => setResult(undefined)}
          className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded ml-2"
        >
          Clear Result
        </button>
      </div>
    </div>
  );
} 