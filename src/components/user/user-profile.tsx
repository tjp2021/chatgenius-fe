'use client';

import { UserProfile as ClerkUserProfile } from "@clerk/nextjs";

export const UserProfile = () => {
  return (
    <div className="flex justify-center p-4">
      <ClerkUserProfile />
    </div>
  );
}; 