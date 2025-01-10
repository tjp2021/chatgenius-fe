import { useTypingIndicator } from '@/hooks/useTypingIndicator';

interface TypingIndicatorProps {
  channelId: string;
}

export function TypingIndicator({ channelId }: TypingIndicatorProps) {
  const { typingUsers } = useTypingIndicator(channelId);

  if (typingUsers.length === 0) return null;

  const formatTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].user.name} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].user.name} and ${typingUsers[1].user.name} are typing...`;
    } else {
      return `${typingUsers[0].user.name} and ${typingUsers.length - 1} others are typing...`;
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
      <div className="flex gap-1">
        <span className="block w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="block w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="block w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{formatTypingText()}</span>
    </div>
  );
} 