'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Hash, Users, ArrowUpDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useSocket } from '@/providers/socket-provider';
import { toast } from '@/components/ui/use-toast';

interface Channel {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  _count: {
    messages: number;
  };
  createdAt: string;
}

export default function BrowseChannelsPage() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('memberCount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['channels', search, sortBy, sortOrder],
    queryFn: async () => {
      const response = await api.get('/channels', {
        params: {
          search,
          sortBy,
          sortOrder,
          type: 'PUBLIC'
        }
      });
      return response.data;
    },
    staleTime: 30000, // 30 seconds as per PRD
  });

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for channel updates
    const handleChannelUpdate = (channelId: string) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    };

    // Listen for member count updates
    const handleMemberCountUpdate = ({ channelId, count }: { channelId: string; count: number }) => {
      queryClient.setQueryData(['channels'], (old: Channel[] = []) => {
        return old.map(channel => {
          if (channel.id === channelId) {
            return { ...channel, memberCount: count };
          }
          return channel;
        });
      });
    };

    socket.on('channel:update', handleChannelUpdate);
    socket.on('channel:member_count', handleMemberCountUpdate);

    return () => {
      socket.off('channel:update', handleChannelUpdate);
      socket.off('channel:member_count', handleMemberCountUpdate);
    };
  }, [socket, isConnected, queryClient]);

  const handleJoinChannel = async (channelId: string) => {
    try {
      await api.post(`/channels/${channelId}/join`);
      
      // Optimistic update
      queryClient.setQueryData(['channels'], (old: Channel[] = []) => {
        return old.map(channel => {
          if (channel.id === channelId) {
            return { ...channel, memberCount: channel.memberCount + 1 };
          }
          return channel;
        });
      });

      router.push(`/channels/${channelId}`);
    } catch (error) {
      console.error('Failed to join channel:', error);
      toast({
        title: 'Error',
        description: 'Failed to join channel. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Browse Public Channels</h1>
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            Back
          </Button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search channels..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select
            value={sortBy}
            onValueChange={setSortBy}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="memberCount">Member Count</SelectItem>
              <SelectItem value="messages">Activity</SelectItem>
              <SelectItem value="createdAt">Creation Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
          >
            <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'desc' ? 'transform rotate-180' : ''}`} />
          </Button>
        </div>

        <div className="grid gap-4">
          {channels.map((channel: Channel) => (
            <div
              key={channel.id}
              className="bg-white p-6 rounded-lg shadow-sm border flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <Hash className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{channel.name}</h3>
                  <p className="text-gray-500">{channel.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {channel.memberCount} members
                    </span>
                    <span>•</span>
                    <span>{channel._count.messages} messages</span>
                    <span>•</span>
                    <span>Created {new Date(channel.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => handleJoinChannel(channel.id)}
                className="ml-4"
              >
                Join Channel
              </Button>
            </div>
          ))}

          {isLoading && (
            <div className="text-center py-8 text-gray-500">
              Loading channels...
            </div>
          )}

          {!isLoading && channels.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No channels found. Try adjusting your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 