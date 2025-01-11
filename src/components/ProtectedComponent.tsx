'use client';

import { useAuth } from '@/hooks/useAuth';
import { getCurrentUser, updateUser } from '@/lib/api';
import { useState } from 'react';

export function ProtectedComponent() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const handleUpdateProfile = async () => {
    if (!user) return;

    setIsUpdating(true);
    try {
      await updateUser({
        name: 'New Name',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const testApiAuth = async () => {
    setTestResult('Testing...');
    try {
      // Test GET request
      const userData = await getCurrentUser();
      setTestResult('✅ API Authentication Success: ' + JSON.stringify(userData, null, 2));
    } catch (error) {
      setTestResult('❌ API Error: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">Please sign in to access this content</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Protected Content</h2>
      <div className="space-y-4">
        <div>
          <p>Welcome, {user?.name}!</p>
          <button
            onClick={handleUpdateProfile}
            disabled={isUpdating}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isUpdating ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
        <div>
          <button
            onClick={testApiAuth}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Test API Auth
          </button>
          {testResult && (
            <pre className="mt-2 p-4 bg-gray-100 rounded overflow-auto">
              {testResult}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
} 