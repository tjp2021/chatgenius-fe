'use client';

import { UserButton } from "@clerk/nextjs";

export const UserSettings = () => {
  return (
    <div className="flex items-center gap-4">
      <UserButton afterSignOutUrl="/"/>
    </div>
  );
}; 