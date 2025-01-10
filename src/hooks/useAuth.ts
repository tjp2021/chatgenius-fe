'use client';

import { useUser } from '@clerk/nextjs';

export function useAuth() {
  const { isLoaded, user } = useUser();

  return {
    isAuthenticated: isLoaded && !!user,
    isLoading: !isLoaded,
    isSyncChecking: false, // We don't need this with Clerk
    user
  };
} 