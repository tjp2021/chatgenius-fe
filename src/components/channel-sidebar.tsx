'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Channel, ChannelType } from '@/types/channel';
import { cn } from '@/lib/utils';
import { api } from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import { ChevronDown, ChevronRight, Hash, Lock, MessageSquare } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSocket } from '@/providers/socket-provider';
import { BrowseChannelsModal } from '@/components/browse-channels-modal';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface JoinedChannelsResponse {
  channels: Array<{
    id: string;
    name: string;
    description: string | null;
    type: 'PUBLIC' | 'PRIVATE' | 'DM';
    _count: {
      members: number;
      messages: number;
      unreadMessages: number;
    };
    createdAt: string;
    isMember: boolean;
    joinedAt: string;
  }>;
}

interface ChannelGroups {
  public: JoinedChannelsResponse['channels'];
  private: JoinedChannelsResponse['channels'];
  dms: JoinedChannelsResponse['channels'];
}

export function ChannelSidebar() {
  const router = useRouter();
  const { socket } = useSocket();
  const { isAuthenticated, isLoading, isSyncChecking } = useAuth();
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false);
  const [channelToLeave, setChannelToLeave] = useState<Channel | null>(null);

  const [channels, setChannels] = useState<ChannelGroups>({
    public: [],
    private: [],
    dms: []
  });
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    public: true,
    private: true,
    dms: true
  });

  const fetchChannels = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoadingChannels(false);
      return;
    }
    
    try {
      setIsLoadingChannels(true);
      const { data } = await api.get<JoinedChannelsResponse>('/channels/browse/joined', {
        params: {
          sort_by: 'created_at',
          sort_order: 'desc'
        }
      });
      
      const channels = data?.channels ?? [];
      
      const grouped = channels.reduce((acc: ChannelGroups, channel) => {
        switch (channel.type) {
          case 'PUBLIC':
            acc.public.push(channel);
            break;
          case 'PRIVATE':
            acc.private.push(channel);
            break;
          case 'DM':
            acc.dms.push(channel);
            break;
        }
        return acc;
      }, { public: [], private: [], dms: [] });

      setChannels(grouped);
    } catch (error) {
      if ((error as any)?.response?.status !== 404) {
        console.error('Failed to fetch channels:', error);
      }
      setChannels({ public: [], private: [], dms: [] });
    } finally {
      setIsLoadingChannels(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !isSyncChecking) {
      fetchChannels();
    }
  }, [isAuthenticated, isSyncChecking, fetchChannels]);

  useEffect(() => {
    if (!socket) return;

    socket.on('channel:update', fetchChannels);
    socket.on('channel:join', fetchChannels);
    socket.on('channel:leave', fetchChannels);

    return () => {
      socket.off('channel:update');
      socket.off('channel:join');
      socket.off('channel:leave');
    };
  }, [socket, fetchChannels]);

  const handleChannelSelect = useCallback((channelId: string) => {
    const path = `/channels/${channelId}`;
    router.push(path);
  }, [router]);

  const toggleSection = (section: keyof ChannelGroups) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (isLoading || isSyncChecking) {
    return <LoadingSpinner />;
  }

  return (
    <div className="h-full bg-emerald-900 text-white p-4">
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

      <div className="space-y-6">
        {/* Public Channels */}
        <div>
          <button
            onClick={() => toggleSection('public')}
            className="flex items-center gap-2 text-sm font-medium mb-2 text-emerald-100 hover:text-white w-full"
          >
            {expandedSections.public ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Hash className="h-4 w-4" />
            <span>PUBLIC CHANNELS</span>
            <span className="text-emerald-300 ml-auto">{channels.public.length}</span>
          </button>
          
          {expandedSections.public && channels.public.map(channel => (
            <button
              key={channel.id}
              onClick={() => handleChannelSelect(channel.id)}
              className="flex items-center gap-2 w-full px-4 py-1 text-sm text-emerald-100 hover:text-white hover:bg-emerald-800/50 rounded"
            >
              <span className="truncate">{channel.name}</span>
              {channel._count?.unreadMessages > 0 && (
                <span className="ml-auto text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                  {channel._count.unreadMessages}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Private Channels */}
        <div>
          <button
            onClick={() => toggleSection('private')}
            className="flex items-center gap-2 text-sm font-medium mb-2 text-emerald-100 hover:text-white w-full"
          >
            {expandedSections.private ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Lock className="h-4 w-4" />
            <span>PRIVATE CHANNELS</span>
            <span className="text-emerald-300 ml-auto">{channels.private.length}</span>
          </button>
          
          {expandedSections.private && channels.private.map(channel => (
            <button
              key={channel.id}
              onClick={() => handleChannelSelect(channel.id)}
              className="flex items-center gap-2 w-full px-4 py-1 text-sm text-emerald-100 hover:text-white hover:bg-emerald-800/50 rounded"
            >
              <span className="truncate">{channel.name}</span>
              {channel._count?.unreadMessages > 0 && (
                <span className="ml-auto text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                  {channel._count.unreadMessages}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Direct Messages */}
        <div>
          <button
            onClick={() => toggleSection('dms')}
            className="flex items-center gap-2 text-sm font-medium mb-2 text-emerald-100 hover:text-white w-full"
          >
            {expandedSections.dms ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <MessageSquare className="h-4 w-4" />
            <span>DIRECT MESSAGES</span>
            <span className="text-emerald-300 ml-auto">{channels.dms.length}</span>
          </button>
          
          {expandedSections.dms && channels.dms.map(channel => (
            <button
              key={channel.id}
              onClick={() => handleChannelSelect(channel.id)}
              className="flex items-center gap-2 w-full px-4 py-1 text-sm text-emerald-100 hover:text-white hover:bg-emerald-800/50 rounded"
            >
              <span className="truncate">{channel.name}</span>
              {channel._count?.unreadMessages > 0 && (
                <span className="ml-auto text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                  {channel._count.unreadMessages}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

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