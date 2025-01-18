'use client';

import { useState } from 'react';
import { Search, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SearchInput } from '@/components/search-input';

interface ChannelHeaderProps {
  channelName: string;
  onSearch: (query: string) => void;
  onClearSearch: () => void;
  isSearchMode: boolean;
}

export function ChannelHeader({ 
  channelName, 
  onSearch,
  onClearSearch,
  isSearchMode 
}: ChannelHeaderProps) {
  return (
    <div className="border-b p-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold">{channelName}</h2>
      <div className="flex items-center gap-2">
        <SearchInput 
          placeholder="Search in channel..." 
          onSearch={onSearch}
          onClear={onClearSearch}
          showClearButton={isSearchMode}
        />
      </div>
    </div>
  );
} 