'use client';

import { Users, Lock, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CreateChannelDialog } from '@/components/create-channel-dialog';

export default function ChannelsPage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-4xl text-center">
        <h1 className="text-2xl font-bold mb-8">Your Channels</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border rounded-lg p-6 shadow-sm">
            <Users className="h-8 w-8 mx-auto mb-4 text-emerald-600" />
            <h2 className="text-lg font-semibold mb-2">Public Channels</h2>
            <p className="text-gray-500 mb-4">Join channels from our public directory</p>
            <button 
              onClick={() => router.push('/channels/browse')}
              className="bg-emerald-900 text-white px-4 py-2 rounded hover:bg-emerald-700 transition-colors"
            >
              Browse Channels
            </button>
          </div>
          <div className="border rounded-lg p-6 shadow-sm">
            <Lock className="h-8 w-8 mx-auto mb-4 text-emerald-600" />
            <h2 className="text-lg font-semibold mb-2">Private Channels</h2>
            <p className="text-gray-500 mb-4">Create and invite others to private channels</p>
            <CreateChannelDialog />
          </div>
          <div className="border rounded-lg p-6 shadow-sm">
            <MessageSquare className="h-8 w-8 mx-auto mb-4 text-emerald-600" />
            <h2 className="text-lg font-semibold mb-2">Direct Messages</h2>
            <p className="text-gray-500 mb-4">Message individuals or create group chats</p>
            <button 
              onClick={() => router.push('/channels/dm/new')}
              className="bg-emerald-900 text-white px-4 py-2 rounded hover:bg-emerald-700 transition-colors"
            >
              New Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 