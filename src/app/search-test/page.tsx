'use client';

import { useState } from 'react';
import { SearchInput } from '@/components/search/search-input';
import { SearchResults } from '@/components/search/search-results';
import { useSocket } from '@/providers/socket-provider';
import { cn } from '@/lib/utils';
import { searchMessages, SearchResponse, SearchResult } from '@/api/search';

export default function SearchTestPage() {
  const { isConnected } = useSocket();
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [lastQuery, setLastQuery] = useState<string>('');
  
  const handleSearch = async (query: string) => {
    if (query === lastQuery || isSearching) {
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      setLastQuery(query);
      const response = await searchMessages(query);
      setResults(response.results);
    } catch (err) {
      setError('Search failed. Please try again.');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Search Test Page</h1>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-red-500"
          )} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>
      
      <SearchInput 
        onSearch={handleSearch}
        placeholder="Type to search..."
      />
      
      {error ? (
        <p className="mt-4 text-sm text-red-500">
          {error}
        </p>
      ) : (
        <div className="mt-6">
          <SearchResults 
            results={results}
            isLoading={isSearching}
          />
        </div>
      )}
    </div>
  );
} 