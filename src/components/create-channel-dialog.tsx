'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

const ChannelType = {
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE',
  DM: 'DM'
} as const;

const formSchema = z.object({
  name: z.string().min(1, 'Channel name is required'),
  type: z.enum(['PUBLIC', 'PRIVATE', 'DM']),
  description: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

interface CreateChannelDialogProps {
  defaultType?: keyof typeof ChannelType;
  trigger?: React.ReactNode;
}

export function CreateChannelDialog({ 
  defaultType = 'PUBLIC',
  trigger
}: CreateChannelDialogProps) {
  const router = useRouter();
  const api = useApi();
  const [open, setOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      type: ChannelType[defaultType],
      description: ''
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await api.createChannel({
        name: data.name,
        type: data.type,
        description: data.description || undefined
      });
      
      router.push(`/channels/${response.id}`);
      setOpen(false);
    } catch (error) {
      console.error('Failed to create channel:', error);
      toast.error('Failed to create channel');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a Channel</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter channel name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={ChannelType.PUBLIC}>Public</SelectItem>
                      <SelectItem value={ChannelType.PRIVATE}>Private</SelectItem>
                      <SelectItem value={ChannelType.DM}>Direct Message</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter channel description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Create Channel</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 