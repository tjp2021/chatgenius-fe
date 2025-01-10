'use client';

import { useAuth as useClerkAuth } from "@clerk/nextjs";

export const useAuth = () => {
  const { getToken } = useClerkAuth();
  
  return {
    getToken: async () => {
      try {
        // Get token directly from Clerk's useAuth hook
        return await getToken();
      } catch (error) {
        console.error('Error getting token:', error);
        throw error;
      }
    }
  };
}; 