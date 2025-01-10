import { /* React, useCallback */ } from 'react';
import { useChannelContext } from '../contexts/channel-context';
import { useToast } from '../components/ui/use-toast';
import { Channel } from '../types/channel';

const ChannelItem = ({ channel }: { channel: Channel }) => {
  const { leaveChannel } = useChannelContext();
  const { toast } = useToast();

  /* const handleLeave = async () => {
    try {
      await leaveChannel(channel.id);
      toast({
        title: "Success",
        description: `Left channel ${channel.name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to leave channel",
        variant: "destructive",
      });
    }
  }; */

  // ... rest of component
};

export default ChannelItem; 