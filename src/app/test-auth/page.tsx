'use client';

import { useAuth } from '@/hooks/useAuth';

export default function TestAuth() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      
      {isLoading ? (
        <div>Loading...</div>
      ) : isAuthenticated ? (
        <div>
          <p>✅ Authenticated</p>
          <pre className="mt-4 p-4 bg-gray-100 rounded">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      ) : (
        <p>❌ Not authenticated</p>
      )}
    </div>
  );
} 