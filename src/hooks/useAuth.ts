'use client';

import { useAuth as useClerkAuth, useUser } from '@clerk/nextjs';

export function useAuth() {
  const { getToken, userId, isLoaded } = useClerkAuth();
  const { user } = useUser();
  
  return {
    isLoading: !isLoaded,
    isAuthenticated: !!userId && isLoaded,
    user: user ? {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      name: user.fullName,
      imageUrl: user.imageUrl
    } : null,
    getToken
  };
} 