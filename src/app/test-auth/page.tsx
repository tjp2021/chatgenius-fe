import { useAuth } from '@/hooks/useAuth';

export default function TestAuth() {
  const { isAuthenticated, isLoading, user, refreshJWT, logout } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-100 rounded">
          <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
          <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
          <p>User: {user ? JSON.stringify(user, null, 2) : 'Not logged in'}</p>
        </div>

        <div className="space-x-4">
          <button
            onClick={refreshJWT}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh Token
          </button>
          
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
} 