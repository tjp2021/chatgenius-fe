'use client';

import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

const MessageThread = ({ message, hasReplies }) => {
  return (
    <button 
      className={cn(
        "hover:bg-accent/50 rounded-sm p-0.5",
        hasReplies ? "text-blue-500" : "text-muted-foreground"
      )}
    >
      <Icons.messageSquare className="h-4 w-4" />
    </button>
  );
};

return (
  // ...
  <MessageThread 
    message={message}
    hasReplies={message.replyCount > 0} // Or however you track replies
  />
  // ...
); 