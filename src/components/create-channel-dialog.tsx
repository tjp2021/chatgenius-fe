'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ChannelType } from '@/types/channel';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/providers/socket-provider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/axios';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  name: z.string()
    .min(1, 'Channel name is required')
    .max(50)
    .regex(/^[a-z0-9-_]+$/, 'Only lowercase letters, numbers, hyphens, and underscores allowed'),
  description: z.string().max(200).optional(),
  type: z.enum(['PUBLIC', 'PRIVATE', 'DM']),
});

type FormData = z.infer<typeof formSchema>;

interface CreateChannelDialogProps {
  onChannelCreated?: () => void;
  className?: string;
}

export function CreateChannelDialog({ 
  onChannelCreated,
  className 
}: CreateChannelDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { socket } = useSocket();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'PUBLIC',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await api.post('/channels', data);
      const newChannel = response.data;
      
      // Emit socket event for real-time update
      if (socket) {
        socket.emit('channel:created', {
          channel: newChannel,
          type: data.type
        });
      }

      toast({
        title: 'Channel created',
        description: `Successfully created #${data.name}`,
      });
      
      setOpen(false);
      form.reset();
      onChannelCreated?.();
      router.push(`/channels/${newChannel.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create channel. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "bg-emerald-900 text-white hover:text-white hover:bg-emerald-800/50",
            className
          )}
        >
          Create Channel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
          <DialogDescription>
            Create a new channel for your team to collaborate in.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="general" {...field} />
                  </FormControl>
                  <FormDescription>
                    Channel name can only contain lowercase letters, numbers, hyphens, and underscores.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="What's this channel about?" {...field} />
                  </FormControl>
                  <FormDescription>
                    A brief description of the channel's purpose.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                      <SelectItem value="PRIVATE">Private</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose who can access this channel.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Create Channel
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 