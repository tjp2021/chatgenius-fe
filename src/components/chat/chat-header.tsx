import { UserSettings } from "@/components/user/user-settings";

export const ChatHeader = () => {
  return (
    <div className="h-16 border-b px-6 flex items-center justify-between">
      <h2 className="text-lg font-semibold">Channel Name</h2>
      <UserSettings />
    </div>
  );
}; 