import { Channel } from '@/types/channel';
import { UserAvatar } from '@/components/user-avatar';
import { cn } from '@/lib/utils';

interface ChannelItemProps {
  channel: Channel;
  isSelected?: boolean;
  onClick?: () => void;
}

export function ChannelItem({ channel, isSelected, onClick }: ChannelItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 rounded-lg p-2 hover:bg-accent",
        isSelected && "bg-accent"
      )}
    >
      {channel.members?.[0] && (
        <UserAvatar userId={channel.members[0].userId} />
      )}
      <div className="flex-1 text-left truncate">
        <p className="font-medium truncate">{channel.name}</p>
        {channel.description && (
          <p className="text-sm text-muted-foreground truncate">
            {channel.description}
          </p>
        )}
      </div>
    </button>
  );
} 