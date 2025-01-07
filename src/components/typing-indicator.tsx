import { useUser } from '@clerk/nextjs';

interface TypingIndicatorProps {
  users: string[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  const { user } = useUser();
  
  // Filter out current user
  const otherUsers = users.filter(id => id !== user?.id);
  
  if (otherUsers.length === 0) return null;

  return (
    <div className="px-4 py-2 text-sm text-muted-foreground">
      {otherUsers.length === 1 && (
        <span>Someone is typing...</span>
      )}
      {otherUsers.length > 1 && (
        <span>Several people are typing...</span>
      )}
    </div>
  );
} 