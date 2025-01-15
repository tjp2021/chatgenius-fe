const MessageThread = ({ message, hasReplies }) => {
  return (
    <button 
      className={cn(
        "hover:bg-accent/50 rounded-sm p-0.5",
        // Add blue color when message has replies
        hasReplies ? "text-blue-500" : "text-muted-foreground"
      )}
      // ... other props
    >
      <MessageSquare className="h-4 w-4" />
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