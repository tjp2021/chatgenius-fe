import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useChannelContext } from '@/contexts/channel-context';
import { ChannelType } from '@/types/channel';
import { useAuth } from '@clerk/nextjs';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateChannelModal({ isOpen, onClose }: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { refreshChannels } = useChannelContext();
  const { getToken } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
          type,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create channel');
      }

      await refreshChannels();
      onClose();
      setName('');
      setDescription('');
      setType('PUBLIC');
    } catch (error) {
      console.error('Error creating channel:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a Channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Channel Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. team-announcements"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Channel Type</Label>
            <RadioGroup value={type} onValueChange={(value: 'PUBLIC' | 'PRIVATE') => setType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PUBLIC" id="public" />
                <Label htmlFor="public">Public - Anyone can join</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PRIVATE" id="private" />
                <Label htmlFor="private">Private - Invite only</Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Channel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 