'use client';

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
}

export function LoadingSpinner({ className }: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent',
        className
      )}
    />
  );
} 