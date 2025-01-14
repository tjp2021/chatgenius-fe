'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';

interface SearchInputProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ 
  onSearch, 
  placeholder = 'Search messages...', 
  className 
}: SearchInputProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Effect to handle debounced search
  useEffect(() => {
    const trimmedSearch = debouncedSearch.trim();
    if (trimmedSearch && trimmedSearch.length >= 2) {  // Only search if 2+ characters
      onSearch(trimmedSearch);
    }
  }, [debouncedSearch, onSearch]);

  return (
    <Input
      type="text"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
} 