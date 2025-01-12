import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChannelContext } from '@/contexts/channel-context';
import { Search, UserPlus } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface User {
  id: string;
  name: string;
  imageUrl?: string;
}

interface CreateDMModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateDMModal({ isOpen, onClose }: CreateDMModalProps) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { refreshChannels } = useChannelContext();
  const { getToken } = useAuth();

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    try {
      setIsLoading(true);
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to search users');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    searchUsers(value);
  };

  const handleCreateDM = async () => {
    if (!selectedUser) return;

    try {
      setIsLoading(true);
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/channels`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'DM',
          userId: selectedUser.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create DM');
      }

      await refreshChannels();
      onClose();
      setSearch('');
      setSelectedUser(null);
      setUsers([]);
    } catch (error) {
      console.error('Error creating DM:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start a Direct Message</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>

          {users.length > 0 && (
            <ScrollArea className="h-[200px] rounded-md border p-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <Avatar>
                    <AvatarImage src={user.imageUrl} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-left">{user.name}</span>
                  {selectedUser?.id === user.id && (
                    <UserPlus className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </ScrollArea>
          )}

          {isLoading && (
            <div className="flex justify-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateDM}
            disabled={!selectedUser || isLoading}
          >
            {isLoading ? 'Creating...' : 'Start Chat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 