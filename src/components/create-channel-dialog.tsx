'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { useChannelContext } from "@/contexts/channel-context";
import { useRouter } from "next/navigation";
import { useToast } from "./ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@clerk/nextjs";
import { UserSearch } from './user-search';
import { useSocket } from '@/providers/socket-provider';
import { ChannelType } from '@/types/channel';
import { api } from "@/lib/axios";

const channelSchema = z.discriminatedUnion('type', [
  // Public channel schema
  z.object({
    type: z.literal('public'),
    name: z.string().min(3, "Channel name must be at least 3 characters"),
    description: z.string().optional(),
    members: z.array(z.string())
  }),
  // Private channel schema
  z.object({
    type: z.literal('private'),
    name: z.string().min(3, "Channel name must be at least 3 characters"),
    description: z.string().optional(),
    members: z.array(z.string()).min(1, "Please add at least one member")
  }),
  // DM channel schema
  z.object({
    type: z.literal('dm'),
    name: z.string().optional(),
    description: z.string().optional(),
    members: z.array(z.string()).min(1, "Please select at least one user to message")
  })
]);

type ChannelFormData = z.infer<typeof channelSchema>;

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateChannelDialog = ({ open, onOpenChange }: CreateChannelDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'public' | 'private' | 'dm'>('public');
  const router = useRouter();
  const { toast } = useToast();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { refreshChannels } = useChannelContext();
  const { socket, isConnected } = useSocket();

  const form = useForm<z.infer<typeof channelSchema>>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      type: 'public',
      name: '',
      description: '',
      members: []
    },
    mode: "onChange"
  });

  // Update type when tab changes
  useEffect(() => {
    const currentMembers = form.getValues('members');
    
    let formData;
    if (activeTab === 'dm') {
      formData = {
        type: 'dm' as const,
        members: currentMembers || [],
        name: undefined,
        description: undefined
      };
    } else if (activeTab === 'private') {
      formData = {
        type: 'private' as const,
        name: form.getValues('name') || '',
        description: form.getValues('description'),
        members: currentMembers || []
      };
    } else {
      formData = {
        type: 'public' as const,
        name: form.getValues('name') || '',
        description: form.getValues('description'),
        members: []
      };
    }
    
    console.log('[CreateChannel] Resetting form with:', formData);
    form.reset(formData);
  }, [activeTab, form]);

  const handleAddMember = (userId: string) => {
    console.log('\n=== MEMBER SELECTION START ===');
    console.log('User clicked:', userId);
    console.log('Current Tab:', activeTab);
    
    const currentMembers = form.getValues('members') || [];
    console.log('Current Members List:', currentMembers);
    
    const newMembers = currentMembers.includes(userId)
      ? currentMembers.filter(id => id !== userId)
      : [...currentMembers, userId];
    
    console.log('Action:', currentMembers.includes(userId) ? 'REMOVING' : 'ADDING');
    console.log('Updated Members List:', newMembers);
    
    form.setValue('members', newMembers, { 
      shouldTouch: true, 
      shouldDirty: true, 
      shouldValidate: true 
    });

    // Verify the update was successful
    const verifyMembers = form.getValues('members');
    console.log('Form Members After Update:', verifyMembers);
    console.log('Form Current Values:', form.getValues());
    console.log('=== MEMBER SELECTION END ===\n');
  };

  const handleSubmit = async (data: ChannelFormData) => {
    try {
      console.log('\n=== CHANNEL CREATION START ===');
      setIsLoading(true);

      const requestBody = {
        name: activeTab !== 'dm' ? data.name : undefined,
        description: activeTab !== 'dm' ? (data.description || "") : undefined,
        type: activeTab === 'public' ? ChannelType.PUBLIC 
           : activeTab === 'private' ? ChannelType.PRIVATE 
           : ChannelType.DM,
        memberIds: filteredMemberIds,
        ownerId: user?.id
      };

      // CORRECT AUTH PATTERN: Use configured api client for authenticated requests
      // This ensures proper token handling and error management
      const response = await api.post('/channels', requestBody);
      const channel = response.data;
      
      console.log('=== CHANNEL CREATED ===');
      console.log('Channel:', channel);

      // First close the dialog and reset form
      onOpenChange(false);
      form.reset();
      
      // Then emit socket event for real-time updates
      if (socket && isConnected) {
        console.log('Emitting channel:created event');
        socket.emit('channel:created', { channel });
      }
      
      // Then refresh channels to update the UI
      await refreshChannels();
      
      toast({
        title: 'Success',
        description: `Channel "${data.name}" has been created`,
      });

      // Finally, navigate to the new channel
      router.push(`/channels/${channel.id}`);

    } catch (error) {
      console.error('Error creating channel:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create channel. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
        </DialogHeader>

        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as 'public' | 'private' | 'dm')} 
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="public">Public</TabsTrigger>
            <TabsTrigger value="private">Private</TabsTrigger>
            <TabsTrigger value="dm">Direct Message</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
              {activeTab !== "dm" && (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Channel Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={activeTab === "public" ? "e.g. general" : "e.g. team-project"} 
                            {...field} 
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
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="What's this channel about?"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {(activeTab === "private" || activeTab === "dm") && (
                <FormField
                  control={form.control}
                  name="members"
                  render={() => (
                    <FormItem>
                      <FormLabel>{activeTab === "dm" ? "Select Users" : "Add Members"}</FormLabel>
                      <FormControl>
                        <UserSearch 
                          onSelect={handleAddMember}
                          selectedUsers={form.getValues('members')}
                          placeholder={activeTab === "dm" ? "Search users to message..." : "Search users to add..."}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || !form.formState.isValid}
                  className={!form.formState.isValid ? "opacity-50 cursor-not-allowed" : ""}
                >
                  {isLoading ? "Creating..." : `Create Channel${!form.formState.isValid ? ' (Validation Failed)' : ''}`}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}; 