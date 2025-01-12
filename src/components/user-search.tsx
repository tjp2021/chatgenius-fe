'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuth } from '@clerk/nextjs';

interface User {
  id: string;
  name: string;
  imageUrl: string;
  isOnline: boolean;
}

interface UserSearchProps {
  onSelect: (userId: string) => void;
  selectedUsers: string[];
  placeholder?: string;
}

export function UserSearch({ onSelect, selectedUsers, placeholder = 'Search users...' }: UserSearchProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { getToken } = useAuth();

  // Set the token whenever it changes
  useEffect(() => {
    const updateToken = async () => {
      const token = await getToken();
      console.log('Token updated:', token ? 'present' : 'missing');
      apiClient.setToken(token);
    };
    updateToken();
  }, [getToken]);

  const { data, isLoading } = useQuery({
    queryKey: ['users', debouncedSearch],
    queryFn: async () => {
      console.log('Executing search query with:', debouncedSearch);
      const result = await apiClient.searchUsers(debouncedSearch);
      console.log('Search result:', result);
      return result;
    },
    enabled: debouncedSearch.length > 0
  });

  useEffect(() => {
    console.log('Search value:', search);
    console.log('Debounced search:', debouncedSearch);
  }, [search, debouncedSearch]);

  const handleSelect = (userId: string) => {
    console.log('Clicked user:', userId);
    onSelect(userId);
  };

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

      <div className="space-y-2">
        {data && Array.isArray(data) ? (
          data.map((user: User) => {
            const isSelected = selectedUsers.includes(user.id);
            
            return (
              <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.imageUrl} alt={user.name || 'User'} />
                    <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
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
                </div>

                <Button
                  type="button"
                  variant={isSelected ? "destructive" : "secondary"}
                  onClick={() => handleSelect(user.id)}
                  className="w-24 cursor-pointer"
                >
                  {isSelected ? "Remove" : "Add"}
                </Button>
              </div>
            );
          })
        ) : null}
      </div>
    </div>
  );
} 