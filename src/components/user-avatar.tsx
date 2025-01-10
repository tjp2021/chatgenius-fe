'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface UserAvatarProps {
  userId: string;
  className?: string;
}

export function UserAvatar({ userId, className }: UserAvatarProps) {
  const { data: user } = useQuery({
    queryKey: ['users', userId],
    queryFn: async () => {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    }
  });

  return (
    <div className={cn("relative inline-block", className)}>
      {user?.imageUrl ? (
        <img
          src={user.imageUrl}
          alt={user.name || 'User'}
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
          <User className="h-4 w-4 text-emerald-600" />
        </div>
      )}
    </div>
  );
} 