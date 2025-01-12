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
    form.reset({
      type: activeTab,
      name: '',
      description: '',
      members: []
    });
  }, [activeTab, form]);

  const handleAddMember = (userId: string) => {
    const currentMembers = form.getValues('members');
    const newMembers = currentMembers.includes(userId)
      ? currentMembers.filter(id => id !== userId)
      : [...currentMembers, userId];
    
    form.setValue('members', newMembers, { 
      shouldTouch: true, 
      shouldDirty: true, 
      shouldValidate: true 
    });
  };

  const handleSubmit = async (data: ChannelFormData) => {
    try {
      setIsLoading(true);
      const token = await getToken();

      // For private channels, ensure we have at least one other member
      if (activeTab === 'private' && data.members.length === 0) {
        toast({
          title: 'Error',
          description: 'Please add at least one member to the private channel',
          variant: 'destructive',
        });
        return;
      }

      const requestBody = {
        name: data.name,
        description: data.description || "",
        type: activeTab.toUpperCase(),
        ownerId: user?.id,
        ...(activeTab === 'private' && {
          memberIds: [user?.id, ...data.members]
        }),
        ...(activeTab === 'dm' && {
          memberIds: data.members.filter(id => id !== user?.id)
        })
      };

      console.log('Creating channel with:', requestBody);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Channel creation error:', errorData);
        throw new Error(errorData?.message || 'Failed to create channel');
      }

      const channel = await response.json();
      console.log('Channel created:', channel);

      // First close the dialog and reset form
      onOpenChange(false);
      form.reset();
      
      // Then emit socket event for real-time updates
      if (socket && isConnected) {
        socket.emit('channel:created', { channel });
      }
      
      // Then refresh channels to update the UI
      await refreshChannels();
      
      // Show success toast
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