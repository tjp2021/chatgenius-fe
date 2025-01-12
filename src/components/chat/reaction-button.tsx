'use client';

import { cn } from '@/lib/utils';

interface ReactionButtonProps {
  emoji: string;
  count: number;
  hasReacted: boolean;
  onToggle: () => void;
}

export function ReactionButton({
  emoji,
  count,
  hasReacted,
  onToggle,
}: ReactionButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors",
        hasReacted 
          ? "bg-blue-100 text-blue-600 hover:bg-blue-200" 
          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
      )}
    >
      <span>{emoji}</span>
      <span>{count}</span>
    </button>
  );
} 