import { MessageDeliveryStatus, MessageReadReceipt } from '@/types/message';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';

interface MessageStatusProps {
  status: MessageDeliveryStatus;
  readBy: MessageReadReceipt[];
  showReadReceipts?: boolean;
}

export function MessageStatus({ status, readBy, showReadReceipts = true }: MessageStatusProps) {
  const getStatusIcon = () => {
    switch (status) {
      case MessageDeliveryStatus.SENT:
        return <Check className="h-4 w-4 text-muted-foreground" />;
      case MessageDeliveryStatus.DELIVERED:
        return <CheckCheck className="h-4 w-4 text-muted-foreground" />;
      case MessageDeliveryStatus.READ:
        return <CheckCheck className="h-4 w-4 text-blue-500" />;
      case MessageDeliveryStatus.FAILED:
        return <span className="text-xs text-destructive">Failed</span>;
      default:
        return null;
    }
  };

  if (!showReadReceipts) {
    return <div className="flex items-center">{getStatusIcon()}</div>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center cursor-default">
            {getStatusIcon()}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" align="center">
          <div className="space-y-2">
            {status === MessageDeliveryStatus.FAILED ? (
              <p className="text-sm text-destructive">Message failed to send</p>
            ) : (
              <>
                {status === MessageDeliveryStatus.SENT && (
                  <p className="text-sm">Sent</p>
                )}
                {status === MessageDeliveryStatus.DELIVERED && (
                  <p className="text-sm">Delivered</p>
                )}
                {status === MessageDeliveryStatus.READ && readBy.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Read by:</p>
                    <div className="space-y-1">
                      {readBy.map(receipt => (
                        <div key={receipt.userId} className="flex items-center gap-2 text-sm">
                          <span>{receipt.user?.name || 'Unknown User'}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(receipt.readAt), 'HH:mm')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 