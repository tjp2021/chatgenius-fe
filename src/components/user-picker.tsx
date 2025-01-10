'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { UserAvatar } from '@/components/user-avatar';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  imageUrl?: string;
}

interface UserPickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export function UserPicker({ value, onChange, placeholder }: UserPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    }
  });

  const filteredUsers = users.filter((user: User) => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedUsers = users.filter((user: User) => value.includes(user.id));

  const handleSelect = useCallback((userId: string) => {
    const isSelected = value.includes(userId);
    if (isSelected) {
      onChange(value.filter(id => id !== userId));
    } else {
      onChange([...value, userId]);
    }
  }, [value, onChange]);

  return (
    <div className="flex flex-col gap-2">
      {/* Selected Users */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user: User) => (
            <div
              key={user.id}
              className="flex items-center gap-2 bg-emerald-100 text-emerald-900 px-2 py-1 rounded-full text-sm"
            >
              <UserAvatar userId={user.id} />
              <span>{user.name}</span>
              <button
                type="button"
                onClick={() => handleSelect(user.id)}
                className="ml-1 text-emerald-700 hover:text-emerald-900"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder || "Search users..."}
          className={cn(
            "w-full px-3 py-2 rounded-md border border-input bg-background",
            "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          )}
        />

        {/* User List */}
        {searchQuery && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredUsers.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No users found
              </div>
            ) : (
              filteredUsers.map((user: User) => (
                <button
                  key={user.id}
                  onClick={() => {
                    handleSelect(user.id);
                    setSearchQuery('');
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left text-sm",
                    "hover:bg-emerald-50",
                    value.includes(user.id) && "bg-emerald-50"
                  )}
                >
                  <UserAvatar userId={user.id} />
                  <span>{user.name}</span>
                  {value.includes(user.id) && (
                    <span className="ml-auto text-emerald-600">✓</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
} 