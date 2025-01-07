import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export const TopNav = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-white border-b shadow-sm">
      <Link 
        href="/channels" 
        className="text-xl font-semibold text-gray-900 hover:text-gray-700"
      >
        ChatGenius
      </Link>
      <div className="flex items-center gap-4">
        <UserButton afterSignOutUrl="/" />
      </div>
    </nav>
  );
}; 