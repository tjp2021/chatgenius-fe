import { SocketTest } from '@/components/socket-test';

export default function SocketTestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Socket Connection Test</h1>
      <SocketTest />
    </div>
  );
} 