'use client';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { useState } from 'react';

export function ProtectedComponent() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const handleUpdateProfile = async () => {
    if (!user) return;

    setIsUpdating(true);
    try {
      await api.updateUser({
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
      const userData = await api.getCurrentUser();
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
      <h1 className="text-2xl font-bold mb-4">Protected Content</h1>
      
      {user && (
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">User Profile</h2>
            <p className="text-gray-600">ID: {user.id}</p>
            <p className="text-gray-600">Email: {user.email}</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleUpdateProfile}
              disabled={isUpdating}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Updating...' : 'Update Profile'}
            </button>

            <button
              onClick={testApiAuth}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
            >
              Test API Auth
            </button>
          </div>

          {testResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">
                {testResult}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 