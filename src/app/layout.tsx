import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'ChatGenius',
  description: 'AI-powered chat application',
};

// Ensure environment variables are loaded
const requiredEnvVars = {
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  afterSignInUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
  afterSignUpUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
};

// Validate all required environment variables
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      publishableKey={requiredEnvVars.publishableKey}
      signInUrl={requiredEnvVars.signInUrl}
      signUpUrl={requiredEnvVars.signUpUrl}
      afterSignInUrl={requiredEnvVars.afterSignInUrl}
      afterSignUpUrl={requiredEnvVars.afterSignUpUrl}
    >
      <html lang="en">
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
