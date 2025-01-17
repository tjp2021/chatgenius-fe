'use client';

import { useState, useEffect, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';

export type SearchType = 'semantic' | 'channel' | 'user' | 'rag';

interface SearchInputProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  searchType?: SearchType;
  minLength?: number;
}

export function SearchInput({ 
  onSearch, 
  placeholder = 'Search messages...', 
  className,
  searchType = 'semantic',
  minLength = 2
}: SearchInputProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    const trimmedSearch = debouncedSearch.trim();
    // Only auto-search for non-RAG and non-semantic queries
    if (!['rag', 'semantic'].includes(searchType) && trimmedSearch && trimmedSearch.length >= minLength) {
      onSearch(trimmedSearch);
    }
  }, [debouncedSearch, onSearch, minLength, searchType]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmedSearch = search.trim();
      if (trimmedSearch && trimmedSearch.length >= minLength) {
        onSearch(trimmedSearch);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
  };

  // Adjust placeholder based on search type
  const getPlaceholder = () => {
    switch (searchType) {
      case 'channel':
        return 'Search in this channel...';
      case 'user':
        return 'Search user messages...';
      case 'rag':
        return 'Ask AI about messages... (press Enter to search)';
      case 'semantic':
        return 'Search messages... (press Enter to search)';
      default:
        return placeholder;
    }
  };

  return (
    <Input
      type="text"
      value={search}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={getPlaceholder()}
      className={className}
    />
  );
} 