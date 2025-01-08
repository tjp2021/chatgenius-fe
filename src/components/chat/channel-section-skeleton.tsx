'use client';

import { cn } from '@/lib/utils';

interface ChannelSectionSkeletonProps {
  className?: string;
}

export function ChannelSectionSkeleton({ className }: ChannelSectionSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Section header */}
      <div className="flex items-center gap-2 px-2 py-1">
        <div className="h-4 w-4 bg-emerald-800/50 rounded animate-pulse" />
        <div className="h-4 w-24 bg-emerald-800/50 rounded animate-pulse" />
      </div>
      
      {/* Channel items */}
      <div className="space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 px-4 py-2">
            <div className="h-4 w-4 bg-emerald-800/50 rounded animate-pulse" />
            <div className="h-4 w-32 bg-emerald-800/50 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
} 