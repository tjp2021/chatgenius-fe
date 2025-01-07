import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs';
import { SocketProvider } from '@/providers/socket-provider';
import { QueryProvider } from '@/providers/query-provider';
import '@/styles/globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <QueryProvider>
            <SocketProvider>
              {children}
            </SocketProvider>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
