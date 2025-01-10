'use client';

import { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface UserPickerProps {
  selectedUsers: string[];
  onSelectionChange: (users: string[]) => void;
  maxUsers?: number;
}

// This is a mock function - replace with actual user fetching logic
const useUsers = () => {
  // Mock data
  return {
    users: [
      { id: "1", name: "John Doe", email: "john@example.com" },
      { id: "2", name: "Jane Smith", email: "jane@example.com" },
      // Add more mock users as needed
    ],
    isLoading: false,
  };
};

export const UserPicker = ({ 
  selectedUsers, 
  onSelectionChange,
  maxUsers = 50 
}: UserPickerProps) => {
  const [open, setOpen] = useState(false);
  const { users, isLoading } = useUsers();

  const toggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      onSelectionChange(selectedUsers.filter(id => id !== userId));
    } else if (selectedUsers.length < maxUsers) {
      onSelectionChange([...selectedUsers, userId]);
    }
  };

  return (
    <Command className="border rounded-lg">
      <CommandInput placeholder="Search users..." />
      <CommandEmpty>No users found.</CommandEmpty>
      <CommandGroup className="max-h-64 overflow-auto">
        {users.map((user) => (
          <CommandItem
            key={user.id}
            onSelect={() => toggleUser(user.id)}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <div className={cn(
              "flex h-6 w-6 items-center justify-center rounded-sm border",
              selectedUsers.includes(user.id) ? "bg-primary border-primary" : "border-input"
            )}>
              <Check
                className={cn(
                  "h-4 w-4",
                  selectedUsers.includes(user.id) ? "text-primary-foreground" : "opacity-0"
                )}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">{user.name}</span>
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
          </CommandItem>
        ))}
      </CommandGroup>
    </Command>
  );
}; 