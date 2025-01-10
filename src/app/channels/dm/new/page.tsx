'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';

interface User {
  id: string;
  name: string;
  imageUrl: string;
}

export default function NewDirectMessagePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: async () => {
      const response = await api.get('/api/users/search', {
        params: { query: search }
      });
      return response.data;
    },
    enabled: search.length >= 2,
  });

  const handleStartDM = async (userId: string) => {
    try {
      const response = await api.post('/api/channels', {
        type: 'DM',
        userIds: [userId]
      });
      
      router.push(`/channels/${response.data.id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start conversation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">New Message</h1>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {search.length < 2 ? (
          <p className="text-center text-gray-500 py-8">
            Start typing to search for users
          </p>
        ) : isLoading ? (
          <p className="text-center text-gray-500 py-8">
            Searching...
          </p>
        ) : users.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No users found
          </p>
        ) : (
          <div className="space-y-2">
            {users.map((user: User) => (
              <button
                key={user.id}
                onClick={() => handleStartDM(user.id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Avatar>
                  <AvatarImage src={user.imageUrl} />
                  <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{user.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 