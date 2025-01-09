Brainlift.md file for chatgenius-fe

#the intent of this document is to collect my learning experiences pertaining specifically to this repo chatgenius-fe.

Problem Analysis [CG-20231218-001]

- **ID**: CG-20231218-001
- **Error Description**: After updating channel browsing API endpoints to `/channels/browse/*`, several components still contain outdated code and inconsistent implementations, potentially causing sync issues with channel memberships.

- **Root Cause Hypotheses**: 
  1. Incomplete API migration:
     - Components still using deprecated `/channels` endpoint
     - Inconsistent parameter naming (snake_case vs camelCase)
  2. Dead code from partial implementation:
     - Commented out read state tracking
     - Unused features in navigation hooks

- **Steps to Reproduce**: 
  1. Check `src/app/channels/browse/page.tsx`:
     - Using old `/channels` endpoint instead of `/channels/browse/public`
     - Query parameters not matching API spec
  2. Check `src/components/channel-list.tsx`:
     - Using old `/channels` endpoint instead of `/channels/browse/joined`
  3. Check `src/components/browse-channels-modal.tsx`:
     - Using inconsistent parameter naming (`sort_by` vs `sortBy`)
  4. Check `src/hooks/useChannelNavigation.ts`:
     - Contains commented out read state tracking code

- **Logs or Relevant Information**:
  Affected files and their issues:
  ```typescript
  // src/app/channels/browse/page.tsx
  const { data: channels = [], isLoading } = useQuery({
    queryFn: async () => {
      const response = await api.get('/channels', {  // OLD endpoint
        params: {
          search,
          sortBy,
          sortOrder,
          type: 'PUBLIC'
        }
      });
      return response.data;
    },
  });

  // src/components/browse-channels-modal.tsx
  sort_by: 'member_count',  // Inconsistent naming
  sort_order: 'desc'

  // src/hooks/useChannelNavigation.ts
  // Mark previous as read (if exists)  // Dead code
  if (currentChannel) {
    // Implementation depends on your read state tracking
  }
  ```

Solution Walkthrough [CG-20231218-001]

- **ID**: CG-20231218-001
- **Solution Description**: Implemented a unified socket-based channel management system with proper state synchronization
- **Why It Worked**: 
  1. **Single Source of Truth**: Moved from a hybrid REST/WebSocket approach to a pure WebSocket-based implementation
  2. **Proper State Management**: 
     - Created a dedicated `useChannels` hook for socket operations
     - Simplified the channel context to be a thin wrapper around the socket hook
     - Removed duplicate state management code
  3. **Clear Component Hierarchy**:
     - `useChannels` (socket logic) → `ChannelContext` (state distribution) → Components (UI)
  4. **Type Safety**: Improved type definitions and consistency across components
  5. **Event Handling**: Proper socket event handling with cleanup

Learning Lessons [CG-20231218-001]

- **ID**: CG-20231218-001
- **Pattern Recognition**:
  1. **Anti-Pattern**: Mixing REST and WebSocket state management led to synchronization issues
  2. **Anti-Pattern**: Multiple hooks managing the same state (`useChannels`, `use-channel.ts`)
  3. **Anti-Pattern**: Inconsistent naming conventions (`useChannels` vs `useChannelContext`)

- **Prevention Strategies**:
  1. Choose a single source of truth for real-time data (WebSocket in this case)
  2. Implement a clear state management hierarchy
  3. Use consistent naming conventions across the application
  4. Maintain proper TypeScript types for better error detection

- **Best Practices Learned**:
  1. **Socket Management**:
     - Initialize socket connections early
     - Handle connection/disconnection gracefully
     - Clean up event listeners properly
  2. **State Management**:
     - Single responsibility principle for hooks
     - Clear separation between data fetching and state distribution
     - Consistent error handling
  3. **Component Architecture**:
     - Use context for state distribution
     - Keep components focused on UI concerns
     - Maintain consistent prop and event handling patterns

- **Future Recommendations**:
  1. **Documentation**:
     - Document WebSocket events and their payloads
     - Maintain a clear state management guide
     - Document component responsibilities
  2. **Testing**:
     - Add unit tests for socket event handlers
     - Add integration tests for state synchronization
     - Add error boundary tests
  3. **Monitoring**:
     - Add telemetry for socket connection status
     - Monitor state synchronization issues
     - Track error rates and types

**Technical Implementation Details**:
1. `useChannels` Hook:
   ```typescript
   - Handles socket events (connect, disconnect, channel updates)
   - Manages channel state (join, leave, update)
   - Provides error handling and loading states
   ```

2. `ChannelContext`:
   ```typescript
   - Distributes channel state to components
   - Manages current channel selection
   - Provides channel operations interface
   ```

3. Component Updates:
   ```typescript
   - Updated imports to use useChannelContext
   - Removed duplicate state management
   - Improved type safety
   ```

Problem Analysis [CG-20240108-002]

- **ID**: CG-20240108-002
- **Error Description**: Browse channels modal showing inconsistent channel membership state - empty public channels list despite existing public channels, and incorrect joined channels list.
- **Root Cause Hypotheses**: 
  1. Frontend filtering logic causing state inconsistency
  2. Caching issues with React Query
  3. Race conditions between channel lists
  4. Backend API returning incorrect data (confirmed as actual cause)
- **Steps to Reproduce**: 
  1. Open browse channels modal
  2. Observe empty public channels list
  3. Observe incorrect joined channels list
  4. Compare with database showing different state
- **Logs or Relevant Information**:
```javascript
// Console logs showed:
- Auth state correct (isAuthenticated: true, isSyncChecking: false)
- Public channels response: {status: 200, channelCount: 0}
- Joined channels response: {status: 200, channelCount: 3}
- Database showed different state than API responses
```

Solution Walkthrough [CG-20240108-002]

- **ID**: CG-20240108-002
- **Solution Description**: Implemented comprehensive frontend debugging to isolate the issue:
  1. Removed all client-side filtering
  2. Added detailed request/response logging
  3. Improved error handling and state management
  4. Added query state debugging
  5. Implemented proper cache invalidation
- **Why It Worked**: 
  - The enhanced debugging clearly showed the backend was returning incorrect data
  - Proved frontend was correctly handling responses
  - Eliminated frontend as source of inconsistency
  - Led to discovery of backend filtering issue
- **Key Lessons**:
  - Trust but verify: Even when frontend looks wrong, thorough debugging can reveal backend issues
  - Logging at key points helped isolate the issue
  - Removing client-side filtering simplified the system

Learning Lessons [CG-20240108-002]

- **Pattern Recognition**:
  1. When state inconsistencies occur, check both frontend and backend
  2. Empty arrays with 200 status codes often indicate filtering issues
  3. Comparing database state with API responses quickly reveals discrepancies

- **Prevention Strategies**:
  1. Implement comprehensive logging at key points
  2. Remove client-side data manipulation where possible
  3. Add explicit error handling for edge cases
  4. Use TypeScript to ensure type safety
  5. Implement proper cache invalidation strategies

- **Best Practices Learned**:
  1. Keep data transformation logic on the backend
  2. Use React Query's built-in cache management
  3. Add detailed debugging information in development
  4. Implement proper error boundaries and fallbacks
  5. Use TypeScript for better type safety

- **Future Recommendations**:
  1. Add API response validation
  2. Implement end-to-end tests for channel membership flows
  3. Add monitoring for empty array responses that should have data
  4. Create development tools for viewing backend state
  5. Add automated tests for membership state changes

Problem Analysis [CG-20240108-003]

- **ID**: CG-20240108-003
- **Error Description**: TypeError: Cannot read properties of undefined (reading 'id') in socket-provider.tsx, occurring during channel member events handling, with "Unauthorized" socket errors
- **Root Cause**: Multiple interconnected issues:
  1. Mismatched data structure expectations between frontend and backend
  2. Incorrect event handling for channel member updates
  3. Race conditions in socket connection and channel state management
- **Steps to Reproduce**:
  1. Connect to socket
  2. Join a channel
  3. Observe console showing "Unauthorized" errors and undefined property access
- **Logs**: Socket connection initialization/cleanup messages, member join events, and TypeError in channel mapping

Solution Walkthrough [CG-20240108-003]

- **ID**: CG-20240108-003
- **Solution Description**: 
  1. Fixed socket authentication by properly setting auth before connection
  2. Corrected event data structure handling
  3. Added proper null checks and error handling
  4. Implemented proper channel state synchronization
- **Why It Worked**: 
  1. Socket auth is now set before connection attempt
  2. Event handlers now match actual backend data structure
  3. Robust error handling prevents undefined access
  4. State management properly tracks channel membership

Learning Lessons [CG-20240108-003]

- **ID**: CG-20240108-003
- **Pattern Recognition**:
  1. Assumed data structures without verifying backend contract
  2. Reactive fixes without understanding root cause
  3. Missing error handling in critical paths
- **Prevention Strategies**:
  1. Define and document API contracts before implementation
  2. Implement comprehensive error handling from the start
  3. Add TypeScript interfaces for all socket events
- **Best Practices Learned**:
  1. Always verify backend data structures before implementation
  2. Add proper logging for socket events
  3. Implement proper cleanup and state management
  4. Use TypeScript more effectively for type safety
- **Future Recommendations**:
  1. Create shared types between frontend and backend
  2. Implement socket event monitoring/debugging tools
  3. Add automated tests for socket connection scenarios
  4. Document socket event structures

Key Insight: Real-time features require more upfront planning and strict contracts between frontend and backend. Most debugging time was spent dealing with mismatched expectations rather than actual functionality issues.

Problem Analysis [CG-20240109-004]

- **ID**: CG-20240109-004
- **Error Description**: Missing Message Input Component in chat interface, preventing users from sending messages in channels (public, private, or DM). Current implementation only handles message display and socket subscriptions.

- **Root Cause Hypotheses**: 
  1. Incomplete Message Feature Implementation:
     - Message list component exists but no input mechanism
     - Socket events for receiving messages exist but sending events not implemented
     - Message mutations not integrated with React Query
  2. Socket Event Gaps:
     - 'message:new' event listener exists but no 'message:send' implementation
     - No message acknowledgment handling
     - No error handling for failed message sends
  3. State Management Inconsistencies:
     - No optimistic updates for sent messages
     - Potential race conditions between socket events and REST API
     - Missing integration with existing channel context

- **Steps to Reproduce**: 
  1. Navigate to any channel in the application
  2. Observe message list implementation in `src/components/message-list.tsx`:
     - Has message display logic
     - Socket subscription for receiving messages
     - No input component or send functionality
  3. Check `src/hooks/use-messages.ts`:
     - Only implements GET request for messages
     - No mutation for sending messages
  4. Review socket provider implementation:
     - Has 'message:new' event listener
     - Missing send message socket events

- **Logs or Relevant Information**:
  Current message-related implementations:
  ```typescript
  // src/hooks/use-messages.ts
  export function useMessages(channelId: string) {
    // Only implements query, no mutations
    return useQuery({
      queryKey: ['messages', channelId],
      queryFn: () => 
        api.get<Message[]>(`/messages/channel/${channelId}`).then(res => res.data),
    });
  }

  // src/components/message-list.tsx
  socket.on('message:new', handleNewMessage);
  // Missing: socket.emit('message:send', ...)
  ```

Problem Analysis [CG-20240109-005]

- **ID**: CG-20240109-005
- **Error Description**: Message synchronization issues between users in chat - messages appear for one user but not the other, indicating a mismatch between our frontend implementation and the backend's expected behavior as documented in FRONTEND_IMPLEMENTATION.md.

- **Root Cause Hypotheses**: 
  1. Implementation Mismatch:
     - Our current implementation uses React Query and custom state management
     - Backend expects direct socket event handling as per FRONTEND_IMPLEMENTATION.md
     - Message delivery confirmation flow doesn't match backend's expectations
  2. Event Flow Differences:
     - Current: Complex flow with React Query cache updates
     - Expected: Simple direct state updates with immediate delivery acknowledgment
     - Missing proper event sequence (SEND → SENT → NEW → DELIVERED)
  3. State Management Complexity:
     - Multiple sources of truth (React Query cache + socket events)
     - Race conditions between REST API and socket updates
     - Overly complex error handling breaking the expected flow

- **Steps to Reproduce**: 
  1. Two users in same channel
  2. User 1 sends message "hello"
  3. Message appears in User 1's chat (green bubble)
  4. Message doesn't appear or appears late in User 2's chat
  5. Observe in console:
     - Socket events not following expected sequence
     - React Query cache updates conflicting with socket events

- **Logs or Relevant Information**:
  ```typescript
  // Current Implementation (problematic)
  const messagesQuery = useQuery({
    queryKey: ['messages', channelId],
    queryFn: () => api.get<Message[]>(`/messages/channel/${channelId}`)
  });

  // Expected Implementation (from FRONTEND_IMPLEMENTATION.md)
  const handleNewMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
    socket.emit(MessageEvent.DELIVERED, {
      messageId: message.id,
      channelId: message.channelId,
      status: MessageDeliveryStatus.DELIVERED
    });
  };
  ```

Solution Walkthrough [CG-20240109-005]

- **ID**: CG-20240109-005
- **Solution Description**: 
  1. Refactor message handling to exactly match FRONTEND_IMPLEMENTATION.md
  2. Remove React Query and complex state management
  3. Implement direct socket event handling
  4. Follow exact message flow from backend documentation

- **Why It Will Work**: 
  1. Eliminates state synchronization issues by using single source of truth
  2. Matches backend's expected event flow exactly
  3. Simplifies message delivery confirmation
  4. Removes potential race conditions

- **Implementation Steps**:
  1. Update `use-messages.ts` to match guide's implementation
  2. Simplify `MessageInput` component
  3. Add proper error handling from guide's section 5
  4. Add offline support from guide's section 6

Learning Lessons [CG-20240109-005]

- **ID**: CG-20240109-005
- **Pattern Recognition**:
  1. Over-engineering with additional state management layers
  2. Not following provided integration documentation exactly
  3. Adding complexity without clear benefits

- **Prevention Strategies**:
  1. Always implement integration points exactly as documented
  2. Avoid adding complexity unless explicitly required
  3. Use the simplest solution that satisfies requirements

- **Best Practices Learned**:
  1. Follow integration documentation precisely
  2. Keep real-time features simple and direct
  3. Use single source of truth for state
  4. Match backend's expected event flow

- **Future Recommendations**:
  1. Document any deviations from provided implementation guides
  2. Test real-time features with multiple users from the start
  3. Maintain close alignment with backend expectations
  4. Add monitoring for message flow and delivery

Problem Analysis [CG-20240109-007]

- **ID**: CG-20240109-007
- **Error Description**: Frontend websocket synchronization issues in channel membership updates, specifically:
  1. UI not updating when joining channels despite successful backend operations
  2. Race conditions between socket events and REST API state
  3. "Not a member of this channel" errors on page reload
  4. Inconsistent state between socket events and React Query cache

- **Root Cause Hypotheses**: 
1. State Management Complexity:
   ```typescript
   // Multiple sources of truth
   - React Query cache (REST API state)
   - Socket event updates
   - Optimistic updates
   - Local state in components
   ```

2. Timing Issues:
   ```typescript
   // Race conditions between:
   - Socket connection establishment
   - Initial data fetching
   - Cache updates
   - Socket event handling
   ```

3. Data Flow Inconsistency:
   ```typescript
   // Different data structures between:
   socket event: {
     channelId, userId, userName, timestamp
   }
   vs
   API response: {
     id, name, description, type, members, _count, etc.
   }
   ```

4. Cache Management Issues:
   ```typescript
   // Complex cache manipulation
   queryClient.setQueryData(['channels', 'browse', 'joined'], (old: any) => {
     // Complex merging logic
     // Manual state updates
     // Potential for inconsistency
   });
   ```

- **Steps to Reproduce**: 
1. Join a channel:
   ```typescript
   // Sequence of events:
   1. REST API call succeeds
   2. Socket event received
   3. UI doesn't update properly
   ```

2. Reload page:
   ```typescript
   // Sequence:
   1. Socket reconnects
   2. Tries to access channel data
   3. "Not a member" errors
   4. Empty channels list
   ```

Solution Walkthrough [CG-20240109-007]

- **ID**: CG-20240109-007
- **Solution Description**: 
1. Simplified State Management:
   ```typescript
   // Instead of complex cache manipulation:
   const handleMemberJoined = (data: any) => {
     if (data.userId === socket.auth?.userId) {
       queryClient.invalidateQueries({ 
         queryKey: ['channels', 'browse', 'joined'] 
       });
     }
   };
   ```

2. Reliable Data Fetching:
   ```typescript
   const { data: channelsData } = useQuery({
     queryKey: ['channels', 'browse', 'joined'],
     staleTime: 0,
     refetchOnMount: true,
     retry: 3
   });
   ```

3. Single Source of Truth:
   - Use server state as the source of truth
   - Remove optimistic updates
   - Rely on refetching for consistency

- **Why It Worked**: 
1. Eliminated race conditions by:
   - Removing complex client-side state management
   - Using server as single source of truth
   - Simplifying data flow

2. Improved reliability through:
   - Consistent refetching strategy
   - Simpler socket event handling
   - Clear data flow patterns

Learning Lessons [CG-20240109-007]

- **Pattern Recognition**:
1. Websocket Anti-patterns:
   - Complex client-side cache manipulation
   - Multiple sources of truth
   - Optimistic updates with socket events
   - Manual state synchronization

2. Successful Patterns:
   - Server as single source of truth
   - Simple socket event handlers
   - Clear data flow
   - Automatic refetching

- **Prevention Strategies**:
1. State Management:
   ```typescript
   // DO:
   - Use server as source of truth
   - Simple socket event handlers
   - Clear data invalidation
   
   // DON'T:
   - Complex cache manipulation
   - Manual state merging
   - Multiple update paths
   ```

2. Data Flow:
   ```typescript
   // DO:
   - One way data flow
   - Consistent data structures
   - Clear update patterns
   
   // DON'T:
   - Bidirectional updates
   - Mixed data structures
   - Complex merge logic
   ```

- **Best Practices Learned**:
1. Websocket Principles:
   - Keep socket handlers simple
   - Use sockets for real-time notifications
   - Rely on REST API for data state
   - Clear separation of concerns

2. State Management:
   - Single source of truth
   - Clear update patterns
   - Simple invalidation strategies
   - Consistent data flow

- **Future Recommendations**:
1. Architecture:
   ```typescript
   // Recommended pattern:
   socket.on('event', () => {
     // Simple notification handling
     queryClient.invalidateQueries()
   });
   ```

2. Testing:
   - Add socket event testing
   - Test state synchronization
   - Verify data consistency
   - Monitor performance

3. Documentation:
   - Document socket events
   - Clear data flow diagrams
   - State management patterns
   - Update strategies

The key insight is that websockets should be used primarily for real-time notifications and triggers, while the actual state management should rely on a more predictable REST API + query invalidation pattern. This separation of concerns leads to more reliable and maintainable code.

Problem Analysis [CG-20240109-008]

- **ID**: CG-20240109-008
- **Error Description**: Socket connection instability causing multiple issues:
  1. Failed POST requests to socket.io endpoint (400 Bad Request)
  2. Public channels showing 0 despite active chat sessions
  3. Frequent connect/disconnect cycles
  4. Authentication token format mismatches
  5. Race conditions in socket lifecycle management

- **Root Cause Hypotheses**: 
  1. Socket Configuration Issues:
     - Incorrect transport order (polling before websocket)
     - Missing or incorrect auth token format
     - Aggressive auto-connect behavior
     - Insufficient timeout and reconnection settings
  2. Connection Lifecycle Issues:
     - No explicit connection management
     - Missing cleanup on reconnection attempts
     - Race conditions between auth state and socket connection
  3. Error Recovery Issues:
     - No systematic reconnection strategy
     - Missing handling for specific disconnect scenarios
     - Insufficient error logging and debugging

- **Steps to Reproduce**: 
  1. Open application and authenticate
  2. Observe network tab for failed POST requests
  3. Check console for connect/disconnect cycles
  4. Verify channel list shows 0 despite being in chat
  5. Monitor auth token format in requests

- **Logs or Relevant Information**:
  ```typescript
  // Failed POST request
  POST http://localhost:3001/socket.io/?EIO=4&transport=polling 400 (Bad Request)
  
  // Console logs showing cycles
  [SOCKET] Connected! ID: AWNDEmwgfmjarEH9AAAR
  [SOCKET] Disconnected: io server disconnect
  [SOCKET] Auth state: {token: "Bearer ey..."}
  ```

Solution Walkthrough [CG-20240109-008]

- **ID**: CG-20240109-008
- **Solution Description**: Implemented comprehensive socket connection management system:
  1. Robust socket configuration
  2. Proper connection lifecycle management
  3. Systematic reconnection strategy
  4. Enhanced error handling and logging

- **Why It Worked**: 
  1. Socket Configuration Improvements:
     ```typescript
     {
       transports: ['websocket', 'polling'], // Prefer websocket
       autoConnect: false, // Manual connection control
       reconnection: true,
       reconnectionAttempts: 5,
       reconnectionDelay: 2000,
       timeout: 20000
     }
     ```
  2. Auth Token Handling:
     ```typescript
     auth: { 
       token: `Bearer ${token}`, // Correct format
       userId 
     }
     ```
  3. Connection Lifecycle:
     ```typescript
     // Clean existing connections
     if (socketInstance) {
       socketInstance.disconnect();
       socketInstance.removeAllListeners();
     }
     
     // Explicit connection
     socketInstance.connect();
     ```
  4. Reconnection Strategy:
     ```typescript
     if (!reconnectTimer) {
       reconnectTimer = setTimeout(() => {
         socketLogger.debug('Attempting to reconnect...');
         initSocket();
       }, 5000);
     }
     ```

- **Key Lessons**:
  1. Socket.io configuration is critical for stability
  2. Auth token format must match server expectations
  3. Manual connection management provides better control
  4. Systematic reconnection handling is essential

Learning Lessons [CG-20240109-008]

- **ID**: CG-20240109-008
- **Pattern Recognition**:
  1. Real-time Connection Patterns:
     - Socket.io prefers websocket over polling
     - Auth token format is critical for handshake
     - Connection lifecycle needs explicit management
  2. Error Patterns:
     - Most connection issues stem from auth/config
     - Reconnection needs systematic approach
     - Different disconnect reasons need different handling

- **Prevention Strategies**:
  1. Configuration:
     - Always prefer websocket transport
     - Use manual connection control
     - Set appropriate timeouts and delays
  2. Authentication:
     - Ensure consistent token format
     - Validate auth before connection
     - Handle auth state changes properly
  3. Error Handling:
     - Implement systematic reconnection
     - Log connection state changes
     - Handle specific disconnect scenarios

- **Best Practices Learned**:
  1. Socket Configuration:
     - Use explicit configuration over defaults
     - Document all config decisions
     - Test with different transport options
  2. Connection Management:
     - Clean up before reconnection
     - Use manual connection control
     - Implement proper cleanup on unmount
  3. Error Recovery:
     - Implement graduated reconnection delays
     - Log detailed connection state
     - Handle all disconnect scenarios

- **Future Recommendations**:
  1. Monitoring:
     - Add connection quality metrics
     - Monitor transport fallbacks
     - Track reconnection patterns
  2. Testing:
     - Add connection resilience tests
     - Test different network conditions
     - Validate reconnection behavior
  3. Documentation:
     - Document expected connection behavior
     - Maintain connection troubleshooting guide
     - Keep config decisions documented

==================================================================

Problem Analysis [CG-20240108-001]

- **ID**: CG-20240108-001
- **Error Description**: Socket errors showing "Invalid `this.prisma.channelMember.delete()` invocation" and unnecessary channel leave events being triggered, causing database errors and invalid token issues.
- **Root Cause Hypotheses**: 
  1. Incorrect socket lifecycle management in useMessages hook
  2. Confusion between socket connection state and channel membership state
  3. Unnecessary channel:leave events on component cleanup
- **Steps to Reproduce**:
  1. Navigate between channels
  2. Observe console logs showing unnecessary channel:leave events
  3. See database errors for attempting to delete non-existent channel members
- **Logs or Relevant Information**:
  ```
  [SOCKET JOIN] Event received:
  channelId: "bb0f33ae-619e-4194-bfe4-71a8ab14b237"
  Socket error: Invalid `this.prisma.channelMember.delete()` invocation
  ```

Solution Walkthrough [CG-20240108-001]

- **ID**: CG-20240108-001
- **Solution Description**: Removed incorrect channel:leave emit from useMessages hook cleanup function, keeping channel membership management strictly tied to explicit user actions.
- **Why It Worked**: 
  1. Channel membership is a database state that should only change on explicit user actions
  2. Component cleanup (unmounting) should only handle socket event listeners
  3. Navigating between channels shouldn't affect channel membership
- **Key Lessons**: 
  1. Socket cleanup should only handle socket event listeners
  2. Database state changes should be tied to user actions
  3. Component unmounting shouldn't trigger backend state changes unless explicitly intended

Learning Lessons [CG-20240108-001]

- **ID**: CG-20240108-001
- **Pattern Recognition**: 
  1. Mixing component lifecycle with business logic
  2. Confusing temporary state (socket connections) with persistent state (channel membership)
  3. Over-engineering cleanup functions
- **Prevention Strategies**:
  1. Keep socket event management separate from business logic
  2. Only modify database state through explicit user actions
  3. Use cleanup functions only for cleaning up subscriptions and listeners
- **Best Practices Learned**:
  1. Socket cleanup should only remove event listeners
  2. Database state changes should be tied to user actions
  3. Component unmounting shouldn't trigger backend state changes
- **Future Recommendations**:
  1. Audit other socket-related hooks for similar issues
  2. Document socket lifecycle management guidelines
  3. Add validation to prevent unintended database operations

==================================================================

Problem Analysis [CG-20240109-001]

- **ID**: CG-20240109-001
- **Error Description**: Real-time chat messages not syncing properly between sender and receiver, with duplicate messages showing inconsistent states (spinner/checkmark)
- **Root Cause Hypotheses**: 
  1. Socket event handlers being bound after events were emitted
  2. Aggressive socket cleanup removing necessary listeners
  3. Message state desync between optimistic updates and server confirmation
  4. Race conditions in channel join and message handling
- **Steps to Reproduce**:
  1. Open chat in two windows
  2. Send message from one window
  3. Observe message not appearing or appearing with incorrect state in other window
- **Logs or Relevant Information**:
  - Multiple "[SOCKET JOIN] Event received" logs
  - Message state inconsistencies between sender/receiver
  - Socket reconnection patterns

Solution Walkthrough [CG-20240109-001]

- **ID**: CG-20240109-001
- **Solution Description**: 
  1. Bind socket event handlers BEFORE joining channel
  2. Implement comprehensive message matching strategy
  3. Ensure consistent message state transitions
  4. Use targeted socket cleanup instead of aggressive removal
- **Why It Worked**:
  ```typescript
  // 1. Proper handler binding order
  socket.on(MessageEvent.NEW, handlers.handleNewMessage);
  socket.emit('channel:join', { channelId });

  // 2. Comprehensive message matching
  const exists = prev.some(m => 
    m.id === message.id || 
    m.tempId === message.id ||
    (m.content === message.content && 
     m.userId === message.userId && 
     Math.abs(new Date(m.createdAt).getTime() - new Date(message.createdAt).getTime()) < 5000)
  );

  // 3. Clear state transitions
  return {
    ...msg,
    id: response.messageId,
    tempId: undefined,
    isPending: false,
    isFailed: false
  };
  ```
- **Key Lessons**: 
  1. Socket event timing is critical
  2. Message identity needs multiple matching strategies
  3. State transitions must be explicit and consistent

Learning Lessons [CG-20240109-001]

- **ID**: CG-20240109-001
- **Pattern Recognition**: 
  - Socket events are timing-sensitive
  - Global state needs careful management
  - Message identity is complex in real-time systems
- **Prevention Strategies**:
  - Bind handlers before any potential event emissions
  - Use multiple message matching strategies
  - Keep socket cleanup targeted and specific
- **Best Practices Learned**:
  - Avoid aggressive socket cleanup
  - Track message states explicitly
  - Log key state transitions
  - Handle both optimistic and confirmed states
- **Future Recommendations**:
  1. Implement message sequence numbers
  2. Add message delivery guarantees
  3. Consider message queue for retries
  4. Add automated tests for state transitions

==================================================================
