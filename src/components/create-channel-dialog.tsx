'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, /* TabsContent, */ TabsList, TabsTrigger } from "./ui/tabs";
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
  const { socket } = useSocket();

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
    console.log('Submit handler triggered with data:', data);
    console.log('Current active tab:', activeTab);
    console.log('Selected member IDs:', data.members);
    console.log('Current user ID:', user?.id);
    console.log('Form state:', form.getValues());
    console.log('Submit button disabled?', isSubmitDisabled());

    try {
      setIsLoading(true);
      const token = await getToken();
      console.log('Got auth token:', !!token);

      // For private channels, ensure we have at least one other member
      if (activeTab === 'private' && data.members.length === 0) {
        console.log('Private channel validation failed - no members');
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
          memberIds: data.members
        }),
        ...(activeTab === 'dm' && {
          memberIds: data.members.filter(id => id !== user?.id)
        })
      };

      console.log('Sending request with body:', requestBody);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to create channel:', {
          status: response.status,
          error: errorData,
          sentData: requestBody
        });
        throw new Error('Failed to create channel');
      }

      const channel = await response.json();
      console.log('Channel created successfully:', {
        channelData: channel,
        requestSent: requestBody
      });

      // First close the dialog and reset form
      onOpenChange(false);
      form.reset();
      
      // Then emit socket event for real-time updates
      if (socket?.isConnected) {
        socket.emit('channel:created', { channel });
      }
      
      // Then refresh channels to update the UI
      await refreshChannels();
      
      // Finally, navigate to the new channel
      router.push(`/channels/${channel.id}`);

    } catch (error) {
      console.error('Channel creation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create channel',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Disable form submission for DM tab if no members selected
  const isSubmitDisabled = () => {
    const otherMembers = form.getValues('members').filter(id => id !== user?.id);
    console.log('Submit button check:', {
      activeTab,
      otherMembers,
      selectedMembers: form.getValues('members'),
      currentUserId: user?.id,
      nameValue: form.getValues("name"),
      isLoading
    });

    if (activeTab === "dm") {
      return otherMembers.length === 0;
    }
    // For non-DM channels, require a name
    return !form.getValues("name") || isLoading;
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
                  render={({ field }) => (
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
                  onClick={() => {
                    console.log('Button clicked');
                    console.log('Detailed form state:', {
                      isValid: form.formState.isValid,
                      errors: form.formState.errors,
                      values: form.getValues(),
                      selectedMembers: form.getValues('members'),
                      activeTab,
                      isDirty: form.formState.isDirty,
                      dirtyFields: form.formState.dirtyFields,
                      touchedFields: form.formState.touchedFields
                    });
                  }}
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