'use client';

import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SocketProvider } from '@/providers/socket-provider';
import { ChannelProvider } from '@/contexts/channel-context';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClerkProvider>
          <QueryClientProvider client={queryClient}>
            <SocketProvider>
              <ChannelProvider>
                {children}
                <Toaster />
              </ChannelProvider>
            </SocketProvider>
          </QueryClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
