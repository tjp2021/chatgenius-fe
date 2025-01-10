'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useToast } from './ui/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuth } from "@clerk/nextjs";

interface UserSearchProps {
  onSelect: (userId: string) => void;
  selectedUsers?: string[];
  placeholder?: string;
}

export function UserSearch({ onSelect, selectedUsers = [], placeholder = 'Search users...' }: UserSearchProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { toast } = useToast();
  const { getToken } = useAuth();

  console.log('Current search:', search);
  console.log('Debounced search:', debouncedSearch);

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', debouncedSearch],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.searchUsers(debouncedSearch, token);
    },
    enabled: debouncedSearch.length > 0,
    retry: false
  });

  useEffect(() => {
    if (error) {
      console.error('Search error:', error);
      toast({
        title: 'Error',
        description: 'Failed to search users',
        variant: 'destructive'
      });
    }
  }, [error, toast]);

  const handleSelect = useCallback((userId: string) => {
    onSelect(userId);
  }, [onSelect]);

  return (
    <div className="w-full space-y-4">
      <Input
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      
      {isLoading && (
        <div className="flex justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {data?.users.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No users found
        </p>
      )}

      <div className="space-y-2">
        {data?.users.map((user) => (
          <button
            key={user.id}
            onClick={() => handleSelect(user.id)}
            disabled={selectedUsers.includes(user.id)}
            className={cn(
              "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors",
              selectedUsers.includes(user.id) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Avatar>
              <AvatarImage src={user.imageUrl || undefined} alt={user.name || 'User'} />
              <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left">
              <p className="font-medium">{user.name}</p>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  user.isOnline ? "bg-green-500" : "bg-gray-300"
                )} />
                <span className="text-sm text-muted-foreground">
                  {user.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
} 