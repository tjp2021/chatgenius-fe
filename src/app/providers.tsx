'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { SocketProvider } from '@/providers/socket-provider';
import { ChannelProvider } from '@/contexts/channel-context';
import { AuthProvider } from '@/providers/auth-provider';
import { env } from '@/env.mjs';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
          >
            <SocketProvider>
              <ChannelProvider>
                {children}
                <Toaster />
              </ChannelProvider>
            </SocketProvider>
          </ThemeProvider>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ClerkProvider>
  );
} 