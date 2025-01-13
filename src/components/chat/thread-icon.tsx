'use client';

import { MessageSquare } from 'lucide-react';

export function ThreadIcon() {
  return (
    <button
      className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
    >
      <MessageSquare className="h-4 w-4 text-black" />
    </button>
  );
} 