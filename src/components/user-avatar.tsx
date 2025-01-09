'use client';

import { useUser } from '@clerk/nextjs';
import { User } from 'lucide-react';

interface UserAvatarProps {
  userId: string;
}

export const UserAvatar = ({ userId }: UserAvatarProps) => {
  const { user } = useUser();
  const isCurrentUser = user?.id === userId;

  return (
    <div className="flex-shrink-0">
      {user?.imageUrl ? (
        <img
          src={user.imageUrl}
          alt={user.fullName || 'User'}
          className="w-8 h-8 rounded-full"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
          <User className="w-4 h-4 text-gray-500" />
        </div>
      )}
    </div>
  );
}; 