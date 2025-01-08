'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Channel, ChannelType, ChannelWithDetails } from '@/types/channel';
import { cn } from '@/lib/utils';
import { api } from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import { ChevronDown, ChevronRight, Hash } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useChannelNavigation } from '@/hooks/useChannelNavigation';
import { useSocket } from '@/providers/socket-provider';
import { BrowseChannelsModal } from '@/components/browse-channels-modal';

interface ChannelGroups {
  public: ChannelWithDetails[];
  private: ChannelWithDetails[];
  dms: ChannelWithDetails[];
}

export function ChannelSidebar() {
  const router = useRouter();
  const { socket } = useSocket();
  const { isAuthenticated, isLoading, userId, isUserSynced } = useAuth();
  const channelNavigation = useChannelNavigation();
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false);

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
    if (!isAuthenticated || !isUserSynced) {
      setIsLoadingChannels(false);
      return;
    }
    
    try {
      setIsLoadingChannels(true);
      const response = await api.get<ChannelWithDetails[]>('/channels');
      
      if (Array.isArray(response.data)) {
        console.log('Raw channel data:', response.data);
        const grouped = {
          public: response.data.filter(c => c.type === ChannelType.PUBLIC),
          private: response.data.filter(c => c.type === ChannelType.PRIVATE),
          dms: response.data.filter(c => c.type === ChannelType.DM)
        };
        console.log('Grouped channels:', grouped);
        setChannels(grouped);
      } else {
        console.error('Invalid response format:', response.data);
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    } finally {
      setIsLoadingChannels(false);
    }
  }, [isAuthenticated, isUserSynced]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated && isUserSynced && !isLoading) {
      fetchChannels();
    }
  }, [isAuthenticated, isUserSynced, isLoading, fetchChannels]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    // Listen for channel updates
    socket.on('channel:created', fetchChannels);
    socket.on('channel:updated', fetchChannels);
    socket.on('channel:deleted', fetchChannels);
    socket.on('channel:join', fetchChannels);
    socket.on('channel:leave', fetchChannels);

    return () => {
      socket.off('channel:created');
      socket.off('channel:updated');
      socket.off('channel:deleted');
      socket.off('channel:join');
      socket.off('channel:leave');
    };
  }, [socket, fetchChannels]);

  const handleChannelSelect = useCallback((channelId: string) => {
    channelNavigation.pushChannel(channelId);
  }, [channelNavigation]);

  const toggleSection = (section: keyof ChannelGroups) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (isLoading || !isUserSynced || !isAuthenticated) {
    return <LoadingSpinner />;
  }

  return (
    <div className="h-screen flex flex-col bg-emerald-900">
      <div className="px-4 py-3 border-b border-emerald-800">
        <h2 className="text-lg font-semibold text-white">Channels</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Browse Channels Button */}
        <button
          onClick={() => setIsBrowseModalOpen(true)}
          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-emerald-800/50 rounded"
        >
          <Hash className="h-4 w-4" />
          <span>Browse Channels</span>
        </button>

        {/* Browse Channels Modal */}
        <BrowseChannelsModal
          open={isBrowseModalOpen}
          onOpenChange={setIsBrowseModalOpen}
        />

        {/* Public Channels */}
        <div>
          <button
            onClick={() => toggleSection('public')}
            className="flex items-center gap-1 text-gray-300 hover:text-white w-full px-2 py-1"
          >
            {expandedSections.public ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="text-sm font-medium">PUBLIC CHANNELS</span>
            <span className="ml-auto text-xs">{channels.public.length}</span>
          </button>
          
          {expandedSections.public && (
            <div className="mt-1 space-y-0.5">
              {channels.public.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => handleChannelSelect(channel.id)}
                  className={cn(
                    'flex items-center gap-2 w-full px-4 py-1 text-sm text-gray-300 hover:text-white hover:bg-emerald-800/50 rounded',
                    channel.id === channelNavigation.currentChannel && 'bg-emerald-800 text-white'
                  )}
                >
                  <Hash className="h-4 w-4" />
                  <span className="truncate">{channel.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Private Channels */}
        <div>
          <button
            onClick={() => toggleSection('private')}
            className="flex items-center gap-1 text-gray-300 hover:text-white w-full px-2 py-1"
          >
            {expandedSections.private ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="text-sm font-medium">PRIVATE CHANNELS</span>
            <span className="ml-auto text-xs">{channels.private.length}</span>
          </button>
          
          {expandedSections.private && (
            <div className="mt-1 space-y-0.5">
              {channels.private.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => handleChannelSelect(channel.id)}
                  className={cn(
                    'flex items-center gap-2 w-full px-4 py-1 text-sm text-gray-300 hover:text-white hover:bg-emerald-800/50 rounded',
                    channel.id === channelNavigation.currentChannel && 'bg-emerald-800 text-white'
                  )}
                >
                  <Hash className="h-4 w-4" />
                  <span className="truncate">{channel.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Direct Messages */}
        <div>
          <button
            onClick={() => toggleSection('dms')}
            className="flex items-center gap-1 text-gray-300 hover:text-white w-full px-2 py-1"
          >
            {expandedSections.dms ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="text-sm font-medium">DIRECT MESSAGES</span>
            <span className="ml-auto text-xs">{channels.dms.length}</span>
          </button>
          
          {expandedSections.dms && (
            <div className="mt-1 space-y-0.5">
              {channels.dms.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => handleChannelSelect(channel.id)}
                  className={cn(
                    'flex items-center gap-2 w-full px-4 py-1 text-sm text-gray-300 hover:text-white hover:bg-emerald-800/50 rounded',
                    channel.id === channelNavigation.currentChannel && 'bg-emerald-800 text-white'
                  )}
                >
                  <Hash className="h-4 w-4" />
                  <span className="truncate">{channel.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 