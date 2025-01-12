'use client';

import { useState } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { useChannelContext } from '@/contexts/channel-context';
import { Channel, ChannelType } from '@/types/channel';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { BrowseChannelsModal } from './browse-channels-modal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { ChannelSection } from './chat/channel-section';
import { Plus, Users } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { CreateChannelModal } from './modals/create-channel-modal';
import { CreateDMModal } from './modals/create-dm-modal';

export function ChannelSidebar() {
  const [channelToLeave, setChannelToLeave] = useState<Channel | null>(null);
  const { channels, isLoading: isLoadingChannels, leaveChannel, selectedChannel, setSelectedChannel } = useChannelContext();
  const { isConnected } = useSocket();
  const { userId } = useAuth();

  const [isBrowseOpen, setIsBrowseOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isCreateDMOpen, setIsCreateDMOpen] = useState(false);

  // Section expansion states
  const [expandedSections, setExpandedSections] = useState({
    public: true,
    private: true,
    dm: true
  });

  const toggleSection = (section: 'public' | 'private' | 'dm') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleLeaveChannel = async () => {
    if (!channelToLeave) return;

    try {
      await leaveChannel(channelToLeave.id);
      setChannelToLeave(null);
    } catch (error) {
      console.error('Failed to leave channel:', error);
    }
  };

  // Transform Channel to ChannelWithDetails
  const transformToChannelWithDetails = (channel: Channel): Channel => ({
    ...channel,
    _count: {
      members: channel._count?.members || 0,
      messages: channel._count?.messages || 0
    },
    members: channel.members || []
  });

  // Filter and transform channels by type
  console.log('[ChannelSidebar] Filtering channels:', channels);
  
  const publicChannels = channels?.filter((channel: Channel) => {
    console.log('[ChannelSidebar] Channel:', channel);
    return channel?.type === ChannelType.PUBLIC;
  }) ?? [];
  
  const privateChannels = channels?.filter((channel: Channel) => 
    channel?.type === ChannelType.PRIVATE
  ) ?? [];
  
  const directMessages = channels?.filter((channel: Channel) => 
    channel?.type === ChannelType.DM
  ) ?? [];

  const handleSetChannelToLeave = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (channel) {
      setChannelToLeave(channel);
    }
  };

  const handleChannelSelect = (channelId: string) => {
    console.log('Channel selected:', channelId);
    setSelectedChannel(channelId);
  };

  return (
    <div className="flex flex-col h-full bg-emerald-900">
      {/* Header */}
      <div className="p-4 border-b border-emerald-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Channels</h2>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-red-500"
            )} />
            <span className="text-sm text-emerald-100">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
        
        {/* Create buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-emerald-800 text-emerald-100 border-emerald-700 hover:bg-emerald-700"
            onClick={() => setIsCreateChannelOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Channel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-emerald-800 text-emerald-100 border-emerald-700 hover:bg-emerald-700"
            onClick={() => setIsCreateDMOpen(true)}
          >
            <Users className="h-4 w-4 mr-1" />
            DM
          </Button>
        </div>
      </div>

      {/* Channel sections */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {isLoadingChannels ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            <ChannelSection
              title="Public Channels"
              channels={publicChannels}
              type={ChannelType.PUBLIC}
              isExpanded={expandedSections.public}
              onToggle={() => toggleSection('public')}
              userId={userId}
              onlineUsers={{}}
              selectedChannel={selectedChannel}
              onChannelSelect={handleChannelSelect}
              onJoinChannel={(channelId) => {}}
              onLeaveChannel={handleSetChannelToLeave}
            />
            
            <ChannelSection
              title="Private Channels"
              channels={privateChannels}
              type={ChannelType.PRIVATE}
              isExpanded={expandedSections.private}
              onToggle={() => toggleSection('private')}
              userId={userId}
              onlineUsers={{}}
              selectedChannel={selectedChannel}
              onChannelSelect={handleChannelSelect}
              onJoinChannel={(channelId) => {}}
              onLeaveChannel={handleSetChannelToLeave}
            />
            
            <ChannelSection
              title="Direct Messages"
              channels={directMessages}
              type={ChannelType.DM}
              isExpanded={expandedSections.dm}
              onToggle={() => toggleSection('dm')}
              userId={userId}
              onlineUsers={{}}
              selectedChannel={selectedChannel}
              onChannelSelect={handleChannelSelect}
              onJoinChannel={(channelId) => {}}
              onLeaveChannel={handleSetChannelToLeave}
            />
          </>
        )}
      </div>

      {/* Browse Channels Button at bottom */}
      <div className="p-2 border-t border-emerald-800">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-emerald-100 hover:bg-emerald-800/50"
          onClick={() => setIsBrowseOpen(true)}
        >
          <Users className="h-4 w-4 mr-2" />
          Browse Channels
        </Button>
      </div>

      {/* Modals */}
      <BrowseChannelsModal
        isOpen={isBrowseOpen}
        onClose={() => setIsBrowseOpen(false)}
      />

      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
      />

      <CreateDMModal
        isOpen={isCreateDMOpen}
        onClose={() => setIsCreateDMOpen(false)}
      />

      <Dialog open={!!channelToLeave} onOpenChange={() => setChannelToLeave(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Channel</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave {channelToLeave?.name}? You&apos;ll need to be invited back to rejoin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChannelToLeave(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLeaveChannel}>
              Leave Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 