'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Channel, ChannelType } from '@/types/channel';
import { cn } from '@/lib/utils';
import { useUser } from "@clerk/nextjs";
import { ChevronDown, ChevronRight, Hash, Lock, MessageSquare, Plus } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { BrowseChannelsModal } from '@/components/browse-channels-modal';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useChannelContext } from '@/contexts/channel-context';
import { CreateChannelDialog } from '@/components/create-channel-dialog';
import { useDMDetails } from '@/hooks/useDMDetails';

interface ChannelGroups {
  public: Channel[];
  private: Channel[];
  dms: Channel[];
}

interface ChannelCount {
  members: number;
  messages: number;
  lastViewedMessageCount?: number;
}

export function ChannelSidebar() {
  const router = useRouter();
  const { isLoaded: authLoading, user } = useUser();
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false);
  const [channelToLeave, setChannelToLeave] = useState<Channel | null>(null);
  const { channels, isLoading: isLoadingChannels, refreshChannels } = useChannelContext();
  const [isOpen, setIsOpen] = useState(false);
  
  // Debug log when channels update
  useEffect(() => {
    console.log('Channel sidebar received channels:', channels);
    console.log('Channel loading state:', isLoadingChannels);
  }, [channels, isLoadingChannels]);

  const [expandedSections, setExpandedSections] = useState({
    public: true,
    private: true,
    dms: true
  });

  // Group channels by type
  const groupedChannels = channels.reduce((acc: ChannelGroups, channel) => {
    console.log('Processing channel:', channel);
    
    // Always use lowercase for consistency
    const lowerType = channel.type?.toLowerCase();
    if (!lowerType) {
      console.warn('Channel missing type:', channel);
      return acc;
    }

    // Add channel to correct group
    switch (lowerType) {
      case 'public':
        acc.public.push(channel);
        break;
      case 'private':
        acc.private.push(channel);
        break;
      case 'dm':
        acc.dms.push(channel);
        break;
      default:
        console.warn('Unknown channel type:', channel.type);
    }
    return acc;
  }, { public: [], private: [], dms: [] });

  // Debug log the grouped channels
  console.log('Grouped channels:', groupedChannels);

  const handleChannelSelect = (channelId: string) => {
    router.push(`/channels/${channelId}`);
  };

  const toggleSection = (section: keyof ChannelGroups) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Refresh channels when sidebar mounts and after any channel action
  useEffect(() => {
    refreshChannels();
  }, [refreshChannels]);

  // Show loader only if auth OR channels are loading
  if (!authLoading || isLoadingChannels) {
    return <LoadingSpinner />;
  }

  return (
    <div className="h-full flex flex-col bg-emerald-900 text-white p-4">
      <div className="mb-6">
        <h2 className="font-semibold mb-2">Channels</h2>
        <button
          onClick={() => setIsBrowseModalOpen(true)}
          className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-emerald-100 hover:text-white hover:bg-emerald-800/50 rounded"
        >
          <Hash className="h-4 w-4" />
          <span>Browse Channels</span>
        </button>
      </div>

      <div className="flex-1 space-y-6">
        {/* Public Channels */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => toggleSection('public')}
              className="flex items-center gap-2 text-sm font-medium text-emerald-100 hover:text-white"
            >
              {expandedSections.public ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Hash className="h-4 w-4" />
              <span>PUBLIC CHANNELS</span>
              <span className="text-emerald-300 ml-2">{groupedChannels.public.length}</span>
            </button>
          </div>
          
          {expandedSections.public && groupedChannels.public.map(channel => (
            <button
              key={channel.id}
              onClick={() => handleChannelSelect(channel.id)}
              className="flex items-center gap-2 w-full px-4 py-1 text-sm text-emerald-100 hover:text-white hover:bg-emerald-800/50 rounded"
            >
              <Hash className="h-4 w-4" />
              <span className="truncate">{channel.name}</span>
            </button>
          ))}
        </div>

        {/* Private Channels */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => toggleSection('private')}
              className="flex items-center gap-2 text-sm font-medium text-emerald-100 hover:text-white"
            >
              {expandedSections.private ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Lock className="h-4 w-4" />
              <span>PRIVATE CHANNELS</span>
              <span className="text-emerald-300 ml-2">{groupedChannels.private.length}</span>
            </button>
          </div>
          
          {expandedSections.private && groupedChannels.private.map(channel => (
            <button
              key={channel.id}
              onClick={() => handleChannelSelect(channel.id)}
              className="flex items-center gap-2 w-full px-4 py-1 text-sm text-emerald-100 hover:text-white hover:bg-emerald-800/50 rounded"
            >
              <span className="truncate">{channel.name}</span>
              {channel._count && channel._count.messages > (channel._count.lastViewedMessageCount || 0) && (
                <span className="ml-auto text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                  {channel._count.messages - (channel._count.lastViewedMessageCount || 0)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Direct Messages */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => toggleSection('dms')}
              className="flex items-center gap-2 text-sm font-medium text-emerald-100 hover:text-white"
            >
              {expandedSections.dms ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <MessageSquare className="h-4 w-4" />
              <span>DIRECT MESSAGES</span>
              <span className="text-emerald-300 ml-2">{groupedChannels.dms.length}</span>
            </button>
          </div>
          
          {expandedSections.dms && groupedChannels.dms.map(channel => {
            const otherMember = channel.members?.find(member => member.userId !== user?.id);
            const displayName = otherMember?.user?.name || 
                              otherMember?.user?.email || 
                              'Unknown User';
            
            return (
              <button
                key={channel.id}
                onClick={() => handleChannelSelect(channel.id)}
                className="flex items-center gap-2 w-full px-4 py-1 text-sm text-emerald-100 hover:text-white hover:bg-emerald-800/50 rounded"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="truncate">{displayName}</span>
                {channel._count && channel._count.messages > (channel._count.lastViewedMessageCount || 0) && (
                  <span className="ml-auto text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                    {channel._count.messages - (channel._count.lastViewedMessageCount || 0)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto p-4 flex justify-center">
        <Button 
          onClick={() => setIsOpen(true)}
          className="w-full bg-emerald-700 hover:bg-emerald-600 text-white"
        >
          Create Channel
        </Button>
      </div>

      <CreateChannelDialog 
        open={isOpen} 
        onOpenChange={setIsOpen}
      />

      <BrowseChannelsModal
        open={isBrowseModalOpen}
        onOpenChange={setIsBrowseModalOpen}
      />

      <Dialog open={!!channelToLeave}>
        <DialogContent>
          <DialogTitle>Leave Channel</DialogTitle>
          <DialogDescription>
            As the owner of <span className="font-medium">{channelToLeave?.name}</span>, what would you like to do?
          </DialogDescription>
          
          <Button variant="outline">
            Leave and Transfer Ownership
            <span className="text-sm text-muted-foreground ml-2">
              (Ownership will be transferred to another member)
            </span>
          </Button>
          
          <Button variant="destructive">
            Delete Channel
            <span className="text-sm text-destructive-foreground ml-2">
              (This action cannot be undone)
            </span>
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
} 