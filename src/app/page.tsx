import { SignInButton, SignUpButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="text-center space-y-8 p-8">
        <h1 className="text-5xl font-bold text-gray-900">
          Welcome to ChatGenius
        </h1>
        
        <p className="text-xl text-gray-600 max-w-2xl">
          Experience the next generation of AI-powered conversations.
        </p>

        <div className="flex gap-4 justify-center">
          <SignInButton mode="modal">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              Sign In
            </button>
          </SignInButton>

          <SignUpButton mode="modal">
            <button className="bg-white hover:bg-gray-50 text-blue-500 px-6 py-3 rounded-lg font-medium border-2 border-blue-500 transition-colors">
              Sign Up
            </button>
          </SignUpButton>
        </div>

        <div className="pt-8">
          <Link 
            href="/dashboard" 
            className="text-blue-500 hover:text-blue-600 font-medium"
          >
            Go to Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}

