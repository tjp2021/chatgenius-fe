'use client';

import { useState } from 'react';
import { SearchInput } from '@/components/search/search-input';
import { useSocket } from '@/providers/socket-provider';
import { cn } from '@/lib/utils';
import { searchMessages, SearchResponse } from '@/api/search';

export default function SearchTestPage() {
  const { isConnected } = useSocket();
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSearch = async (query: string) => {
    try {
      setIsSearching(true);
      setError(null);
      const results = await searchMessages(query);
      console.log('Search results:', results);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
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
      
      {isSearching && (
        <p className="mt-4 text-sm text-muted-foreground animate-pulse">
          Searching...
        </p>
      )}
      
      {error && (
        <p className="mt-4 text-sm text-red-500">
          {error}
        </p>
      )}
      
      {!isSearching && !error && (
        <p className="mt-4 text-sm text-muted-foreground">
          Check console for search results
        </p>
      )}
    </div>
  );
} 