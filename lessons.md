# Authentication Debugging Lessons

## Problem
We encountered an issue where our frontend application was stuck in an infinite loop of authentication requests, with errors indicating server-side auth methods were being used in a client context:

```
Failed to get token: Error: auth() can only be used in a server environment.
  at JWTService.getToken (jwt.ts:7:34)
```

### Root Causes
1. **Mixing Server and Client Auth**: We were using Clerk's `auth()` method (server-side) in client-side code
2. **Multiple Token Management Systems**: Had overlapping token management between JWT service and auth hook
3. **Aggressive Retry Logic**: Implemented retry mechanisms at multiple levels causing cascade of requests

## Solution
We implemented a cleaner separation of concerns:

1. **JWT Service Refactor**
```typescript
class JWTService {
  private tokenGetter: (() => Promise<string | null>) | null = null;

  setTokenGetter(getter: () => Promise<string | null>) {
    this.tokenGetter = getter;
  }

  async getToken(): Promise<string | null> {
    // Simple delegation to the provided getter
  }
}
```

2. **Auth Hook Improvements**
- Separated token management from user sync
- Removed redundant token storage
- Eliminated retry loops
- Used client-safe Clerk methods

## Key Learnings

1. **Client vs Server Authentication**
   - Always use `useAuth()` for client-side auth
   - Reserve `auth()` for server components/API routes
   - Be mindful of where auth code runs

2. **Token Management**
   - Single source of truth for tokens
   - Clear delegation of responsibilities
   - Avoid storing tokens in multiple places

3. **Error Handling**
   - Don't retry auth failures aggressively
   - Handle 404s and auth failures gracefully
   - Clear error states to prevent loops

4. **State Management**
   - Keep auth state simple and predictable
   - Use proper cleanup in useEffect
   - Be careful with dependencies in auth-related effects

## Best Practices Going Forward

1. Always check whether auth code is running in client or server context
2. Use appropriate Clerk methods for each context
3. Implement simple, clear token management
4. Avoid multiple retry mechanisms
5. Keep auth state management centralized
6. Use proper TypeScript types for auth-related data
7. Handle auth errors gracefully without cascading retries 