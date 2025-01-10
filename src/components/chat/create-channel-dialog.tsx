'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { ChannelType } from '@/types/channel';
import { useApi } from '@/hooks/useApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const createChannelSchema = z.object({
  name: z.string().min(1, 'Channel name is required').max(50),
  description: z.string().max(500).optional(),
});

type FormData = z.infer<typeof createChannelSchema>;

interface CreateChannelDialogProps {
  defaultType: ChannelType;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateChannelDialog({
  defaultType,
  children,
  open,
  onOpenChange,
}: CreateChannelDialogProps) {
  const router = useRouter();
  const { createChannel } = useApi();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(createChannelSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      const channel = await createChannel({
        ...data,
        type: defaultType,
      });
      form.reset();
      onOpenChange?.(false);
      router.push(`/channels/${channel.id}`);
    } catch (error) {
      console.error('Failed to create channel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create {defaultType.toLowerCase()} channel</DialogTitle>
          <DialogDescription>
            Create a new channel to chat with others.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. general"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="What's this channel about?"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                Create Channel
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 