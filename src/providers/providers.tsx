'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth-provider';
import { SocketProvider } from './socket-provider';
import { ChannelProvider } from '@/contexts/channel-context';
import { Toaster } from '@/components/ui/toaster';
import { useChannelSocket } from '@/hooks/useChannelSocket';

// Wrapper component to initialize channel socket events
function ChannelSocketManager({ children }: { children: React.ReactNode }) {
  useChannelSocket();
  return <>{children}</>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <ChannelProvider>
            <ChannelSocketManager>
              {children}
              <Toaster />
            </ChannelSocketManager>
          </ChannelProvider>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
} 