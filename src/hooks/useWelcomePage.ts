import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChannelGroups } from '@/types/channel';

interface UseWelcomePageReturn {
  shouldShowWelcome: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useWelcomePage(): UseWelcomePageReturn {
  const router = useRouter();

  // Fetch user's channel memberships
  const { data: channelGroups, isLoading, error } = useQuery<ChannelGroups>({
    queryKey: ['channels'],
    queryFn: async () => {
      const response = await fetch('/channels');
      if (!response.ok) {
        throw new Error('Failed to fetch channels');
      }
      return response.json();
    },
  });

  const hasNoChannels = !channelGroups?.public.length && 
                       !channelGroups?.private.length && 
                       !channelGroups?.dms.length;

  // Redirect logic based on channel membership
  useEffect(() => {
    if (isLoading || error) return;

    if (!hasNoChannels) {
      // Follow priority order from PRD
      const firstPublicChannel = channelGroups?.public[0];
      const firstPrivateChannel = channelGroups?.private[0];
      const firstDM = channelGroups?.dms[0];

      const targetChannel = firstPublicChannel || firstPrivateChannel || firstDM;
      
      if (targetChannel) {
        router.push(`/channels/${targetChannel.id}`);
      }
    }
  }, [channelGroups, hasNoChannels, isLoading, router, error]);

  useEffect(() => {
    if (error) {
      // Handle error
    }
  }, [error]);

  return {
    shouldShowWelcome: hasNoChannels,
    isLoading,
    error: error as Error | null,
  };
} 