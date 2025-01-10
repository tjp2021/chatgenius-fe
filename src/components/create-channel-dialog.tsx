'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { UserPicker } from "./user-picker";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { useChannelContext } from "@/contexts/channel-context";
import { useRouter } from "next/navigation";
import { useToast } from "./ui/use-toast";
import { useAuth } from "@/hooks/useAuth";

const channelSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().max(500).optional(),
  members: z.array(z.string()).optional(),
});

type ChannelFormData = z.infer<typeof channelSchema>;

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateChannelDialog = ({ open, onOpenChange }: CreateChannelDialogProps) => {
  const [activeTab, setActiveTab] = useState("public");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { getToken } = useAuth();
  const { refreshChannels } = useChannelContext();
  
  const form = useForm<ChannelFormData>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      name: "",
      description: "",
      members: [],
    },
  });

  const handleSubmit = async (data: ChannelFormData) => {
    try {
      setIsLoading(true);
      
      // Get the auth token using the useAuth hook
      const token = await getToken();
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Use HTTP POST to /api/channels endpoint with auth
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description || "",
          type: activeTab.toUpperCase(),
          members: data.members || [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to create channel');
      }

      const newChannel = await response.json();
      
      await refreshChannels();
      
      toast({
        title: "Success",
        description: `Channel ${data.name} created successfully`,
      });

      onOpenChange(false);
      form.reset();
      router.push(`/channels/${newChannel.id}`);

    } catch (error) {
      console.error('Error creating channel:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create channel. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Disable form submission for DM tab if no members selected
  const isSubmitDisabled = () => {
    if (activeTab === "dm" && (!form.getValues("members")?.length || form.getValues("members")?.length === 0)) {
      return true;
    }
    return isLoading;
  };

  // Hide name/description fields for DM tab
  const showNameDescription = activeTab !== "dm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="public">Public</TabsTrigger>
            <TabsTrigger value="private">Private</TabsTrigger>
            <TabsTrigger value="dm">Direct Message</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
              {showNameDescription && (
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
                        <UserPicker 
                          selectedUsers={field.value || []}
                          onSelectionChange={(users) => field.onChange(users)}
                          maxUsers={activeTab === "dm" ? 8 : undefined}
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
                  disabled={isSubmitDisabled()}
                >
                  {isLoading ? "Creating..." : "Create Channel"}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}; 