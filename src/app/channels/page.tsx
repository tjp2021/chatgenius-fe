'use client';

import { Hash, Lock, MessageSquare, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ChannelsPage() {
  const router = useRouter();

  return (
    <div className="flex-1 p-6 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to ChatGenius!</h1>
        <p className="text-gray-600">Get started by joining channels or creating your own conversations</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-3">Understanding Channel Types</h2>
        
        <div className="bg-white rounded p-4 flex items-start gap-3">
          <Hash className="h-5 w-5 text-emerald-600 mt-1 shrink-0" />
          <div>
            <h3 className="text-lg font-semibold mb-1">Public Channels</h3>
            <p className="text-gray-600 text-sm">Open to everyone. Great for team-wide discussions and announcements.</p>
          </div>
        </div>

        <div className="bg-white rounded p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-emerald-600 mt-1 shrink-0" />
          <div>
            <h3 className="text-lg font-semibold mb-1">Private Channels</h3>
            <p className="text-gray-600 text-sm">Invitation-only spaces for sensitive discussions and focused team collaboration.</p>
          </div>
        </div>

        <div className="bg-white rounded p-4 flex items-start gap-3">
          <MessageSquare className="h-5 w-5 text-emerald-600 mt-1 shrink-0" />
          <div>
            <h3 className="text-lg font-semibold mb-1">Direct Messages</h3>
            <p className="text-gray-600 text-sm">One-on-one or small group conversations for quick communication.</p>
          </div>
        </div>
      </div>

      {/* Quick Help Section */}
      <div className="border-t pt-4 mt-6">
        <Tabs defaultValue="getting-started">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
            <TabsTrigger value="tips">Tips & Tricks</TabsTrigger>
            <TabsTrigger value="help">Need Help?</TabsTrigger>
          </TabsList>
          <TabsContent value="getting-started" className="mt-3">
            <div className="space-y-1.5">
              <p className="text-sm text-gray-600">1. Start by browsing public channels to find conversations that interest you</p>
              <p className="text-sm text-gray-600">2. Join channels by clicking the "Join Channel" button</p>
              <p className="text-sm text-gray-600">3. Create your own channels for specific topics or teams</p>
            </div>
          </TabsContent>
          <TabsContent value="tips" className="mt-3">
            <div className="space-y-1.5">
              <p className="text-sm text-gray-600">• Use public channels for team-wide communication</p>
              <p className="text-sm text-gray-600">• Private channels are perfect for sensitive discussions</p>
              <p className="text-sm text-gray-600">• Direct messages work best for quick, informal chats</p>
            </div>
          </TabsContent>
          <TabsContent value="help" className="mt-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <p className="text-sm text-gray-600">Need assistance? Our support team is here to help!</p>
                <button 
                  onClick={() => router.push('/help')}
                  className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center gap-1"
                >
                  <HelpCircle className="h-4 w-4" />
                  Visit Help Center
                </button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 