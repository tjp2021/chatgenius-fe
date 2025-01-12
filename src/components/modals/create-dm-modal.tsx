import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChannelContext } from '@/contexts/channel-context';
import { Search, UserPlus } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

interface User {
  id: string;
  name: string;
  imageUrl?: string;
  isOnline?: boolean;
  email?: string;
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add cleanup for timeout
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const searchUsers = async (query: string) => {
    console.log('searchUsers called with query:', query);
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const searchUrl = `${process.env.NEXT_PUBLIC_API_URL}/users/search?query=${encodeURIComponent(query)}`;
      console.log('Making search request to:', searchUrl);
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Search error:', errorData);
        throw new Error(errorData?.message || 'Failed to search users');
      }

      const data = await response.json();
      console.log('Search response:', data);
      
      if (!data.users || !Array.isArray(data.users)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }
      
      setUsers(data.users.filter((user: { id?: string; name?: string }) => user.id && user.name));
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to search users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('Search value changed:', value);
    setSearch(value);
    
    if (!value.trim()) {
      console.log('Empty search, clearing users');
      setUsers([]);
      return;
    }
    
    if (value.length >= 2) {
      console.log('Search length >= 2, triggering search');
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        console.log('Executing search for:', value);
        searchUsers(value);
      }, 300);
    }
  };

  const handleCreateDM = async () => {
    if (!selectedUser) return;

    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'DM',
          targetUserId: selectedUser.id,
          name: `DM-${selectedUser.name}`.slice(0, 50)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('DM creation error:', errorData);
        throw new Error(errorData?.message || 'Failed to create DM');
      }

      const data = await response.json();
      console.log('DM creation response:', data);

      await refreshChannels();
      onClose();
      toast({
        title: "Success",
        description: `Started a conversation with ${selectedUser.name}`,
      });
    } catch (error) {
      console.error('Error creating DM:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create DM. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start a Direct Message</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Search Users</Label>
            <Input
              placeholder="Type a name..."
              value={search}
              onChange={handleSearchChange}
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin h-6 w-6 border-4 border-emerald-500 border-t-transparent rounded-full" />
            </div>
          ) : users && users.length > 0 ? (
            <ScrollArea className="h-[200px] rounded-md border">
              <div className="p-2 space-y-2">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={cn(
                      "flex items-center gap-3 w-full p-3 rounded-lg transition-colors",
                      selectedUser?.id === user.id 
                        ? "bg-emerald-900/10 hover:bg-emerald-900/20" 
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={user.imageUrl} alt={user.name} />
                        <AvatarFallback>{user.name[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white",
                        user.isOnline ? "bg-green-500" : "bg-gray-400"
                      )} />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{user.name}</span>
                      {user.email && (
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                      )}
                    </div>
                    {selectedUser?.id === user.id && (
                      <div className="ml-auto">
                        <UserPlus className="h-4 w-4 text-emerald-500" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : search.trim() !== '' ? (
            <p className="text-center text-muted-foreground py-8">No users found</p>
          ) : null}
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