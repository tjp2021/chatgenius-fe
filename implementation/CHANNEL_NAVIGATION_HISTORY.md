# Channel Navigation History

## Overview
This document outlines the implementation requirements for channel navigation history, enabling users to navigate between previously visited channels and maintain navigation state across sessions.

## Frontend Implementation

### Navigation Hook
```typescript
// src/hooks/useChannelHistory.ts

interface ChannelHistory {
  channelId: string;
  timestamp: number;
}

interface ChannelHistoryHook {
  history: ChannelHistory[];
  currentIndex: number;
  pushToHistory: (channelId: string) => void;
  goBack: () => string | null;
  goForward: () => string | null;
  canGoBack: boolean;
  canGoForward: boolean;
}
```

### Requirements
1. Store last 10 unique channels visited
2. Clear history on workspace switch
3. Preserve across browser sessions
4. Support keyboard shortcuts (⌘+[ and ⌘+])
5. Sync across devices (optional)

### Storage
- Use localStorage for session persistence
- Implement cleanup for old entries
- Handle workspace switches

## Backend Implementation

### Database Schema
```typescript
interface ChannelHistoryStorage {
  userId: string;
  workspaceId: string;
  history: {
    channelId: string;
    timestamp: number;
  }[];
  lastActiveChannel: string;
}
```

### REST API Endpoints

#### Get User Channel History
```typescript
GET /api/users/channel-history

Response:
{
  history: {
    channelId: string;
    timestamp: number;
  }[];
  lastActiveChannel: string;
}
```

#### Update Channel History
```typescript
POST /api/users/channel-history
Body: {
  channelId: string;
  timestamp: number;
}
```

### WebSocket Events

#### History Sync Event
```typescript
// Emitted when history updates on another device
interface HistorySyncEvent {
  userId: string;
  history: ChannelHistory[];
  lastActiveChannel: string;
}

socket.on('channel:history_sync', (data: HistorySyncEvent) => {
  // Update local history
});
```

## Implementation Guidelines

### Frontend
1. Initialize history from localStorage
2. Sync with backend on changes
3. Handle navigation events
4. Update URL without full page reload
5. Maintain separate history per workspace

### Backend
1. Store history in database
2. Implement cleanup for old entries
3. Handle cross-device sync
4. Validate channel access on history navigation
5. Rate limit history updates

## Error Handling

### Frontend
1. Handle invalid channel IDs
2. Handle network failures
3. Handle permission changes
4. Implement fallback navigation

### Backend
1. Validate channel existence
2. Check user permissions
3. Handle concurrent updates
4. Implement retry logic

## Performance Considerations

1. Batch history updates
2. Cache recent history
3. Optimize sync operations
4. Minimize storage size
5. Handle large history sets

## Security

1. Validate channel access
2. Sanitize history data
3. Rate limit requests
4. Handle permission changes
5. Audit history access 