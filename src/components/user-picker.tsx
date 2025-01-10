'use client';

import { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/* interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
} */

interface UserPickerProps {
  /* users: User[]; */
  onSelect: (userId: string) => void;
  selectedUsers: string[];
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

export function UserPicker({ onSelect, selectedUsers }: UserPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  /* const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false); */
  const { users, isLoading } = useUsers();

  const toggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      onSelect(userId);
    } else if (selectedUsers.length < 50) {
      onSelect(userId);
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
} 