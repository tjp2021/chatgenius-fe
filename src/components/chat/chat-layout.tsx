'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/providers/socket-provider';
import { Send, Users, Hash, ChevronDown } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { ChatWindow } from './ChatWindow';

export function ChatLayout() {
  const { isConnected: socketConnected } = useSocket();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <div className="w-64 bg-emerald-900 h-full flex flex-col">
        {/* Test Button */}
        <button 
          onClick={() => {
            console.log('TEST BUTTON CLICKED');
            alert('Button clicked!');
          }}
          className="p-4 bg-red-500 text-white"
        >
          TEST BUTTON - CLICK ME
        </button>

        {/* Header */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-white">Channels</h1>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-300">Connected</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1 bg-emerald-800 hover:bg-emerald-700 text-white border-0">
              + Channel
            </Button>
            <Button variant="ghost" className="flex-1 bg-emerald-800 hover:bg-emerald-700 text-white border-0">
              <Users className="w-4 h-4 mr-2" />
              DM
            </Button>
          </div>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-2">
            {/* Public Channels */}
            <div className="mb-2">
              <button className="w-full flex items-center text-gray-300 hover:text-white px-2 py-1">
                <ChevronDown className="w-4 h-4 mr-1" />
                <span>Public Channels</span>
                <span className="ml-auto text-sm">1</span>
              </button>
              <div className="mt-1">
                <Button 
                  onClick={() => {
                    console.log('BUTTON CLICKED!!!');
                    setSelectedChannelId('f47ac10b-58cc-4372-a567-0e02b2c3d479');
                  }}
                  variant="ghost"
                  className={`w-full flex items-center justify-start gap-2 text-gray-300 hover:text-white px-4 py-1 rounded hover:bg-emerald-800 ${
                    selectedChannelId === 'f47ac10b-58cc-4372-a567-0e02b2c3d479' ? 'bg-emerald-800 text-white' : ''
                  }`}
                >
                  <Hash className="w-4 h-4" />
                  asdflafsfd
                </Button>
              </div>
            </div>

            {/* Private Channels */}
            <div className="mb-2">
              <button className="w-full flex items-center text-gray-300 hover:text-white px-2 py-1">
                <ChevronDown className="w-4 h-4 mr-1" />
                <span>Private Channels</span>
              </button>
            </div>

            {/* Direct Messages */}
            <div className="mb-2">
              <button className="w-full flex items-center text-gray-300 hover:text-white px-2 py-1">
                <ChevronDown className="w-4 h-4 mr-1" />
                <span>Direct Messages</span>
              </button>
            </div>
          </div>
        </div>

        {/* Browse Channels */}
        <div className="p-4 mt-auto">
          <Button 
            variant="ghost" 
            className="w-full bg-emerald-800 hover:bg-emerald-700 text-white border-0"
          >
            <Users className="w-4 h-4 mr-2" />
            Browse Channels
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white">
        {selectedChannelId ? (
          <ChatWindow channelId={selectedChannelId} />
        ) : (
          <div className="p-8">
            <h1 className="text-2xl font-semibold text-center mb-4">Welcome to ChatGenius!</h1>
            <p className="text-center text-gray-600 mb-8">Get started by joining channels or creating your own conversations</p>
            
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-xl font-medium">Public Channels</h2>
                </div>
                <p className="text-gray-600 ml-7">Open to everyone. Great for team-wide discussions and announcements.</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 flex items-center justify-center">🔒</div>
                  <h2 className="text-xl font-medium">Private Channels</h2>
                </div>
                <p className="text-gray-600 ml-7">Invitation-only spaces for sensitive discussions and focused team collaboration.</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-xl font-medium">Direct Messages</h2>
                </div>
                <p className="text-gray-600 ml-7">One-on-one or small group conversations for quick communication.</p>
              </div>
            </div>

            <div className="mt-12 space-y-4">
              <div className="flex items-center gap-4">
                <div className="bg-gray-50 rounded-lg p-4 flex-1">
                  <h3 className="text-lg font-medium mb-2">Getting Started</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-600">
                    <li>Start by browsing public channels to find conversations that interest you</li>
                    <li>Join channels by clicking the &quot;Join Channel&quot; button</li>
                  </ol>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 flex-1">
                  <h3 className="text-lg font-medium mb-2">Tips & Tricks</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-600">
                    <li>Use @ mentions to notify specific team members</li>
                    <li>Star important messages for quick reference</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 