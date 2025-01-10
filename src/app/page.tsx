'use client';

import { useRouter } from 'next/navigation';
import { useAuth, SignInButton, SignUpButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

export default function Home() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-6 py-4">
        <div className="text-2xl font-bold text-[#1B4332]">ChatGenius</div>
        <div className="flex gap-4">
          <SignInButton afterSignInUrl="/channels" />
          <SignUpButton afterSignUpUrl="/channels" />
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 -mt-16">
        <h1 className="text-[#081C15] text-6xl font-bold max-w-4xl leading-tight mb-6">
          Where{" "}
          <span className="text-[#1B4332]">
            AI-powered
            <br />
            collaboration
          </span>
          <br />
          happens
        </h1>
        
        <p className="text-[#52796F] text-xl max-w-2xl mb-12">
          Transform your team communication with intelligent chat, automated
          workflows, and AI assistance.
        </p>

        <div className="flex justify-center mb-8">
          <SignUpButton afterSignInUrl="/channels">
            <Button>Get Started</Button>
          </SignUpButton>
        </div>

        <p className="text-[#52796F]">
          Free to try, no credit card required
        </p>
      </main>
    </div>
  );
}

