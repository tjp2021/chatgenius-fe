# Channel Activity Tracking

## Overview
This document outlines the implementation requirements for real-time channel activity tracking, including unread states, mentions, and activity metrics.

## Feature Requirements

### Activity Metrics
1. Message frequency tracking
2. Active user monitoring
3. Activity level calculation
4. Historical data storage
5. Real-time updates

### Unread State
1. Per-user read positions
2. Unread message counts
3. Mention tracking
4. Bulk updates support
5. Cross-device sync

## Backend Implementation

### REST API Endpoints

#### Get Channel Activity
```typescript
GET /api/channels/:channelId/activity

Response:
interface ChannelActivityResponse {
  activityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  metrics: {
    messagesLast24h: number;
    uniqueUsers24h: number;
    lastMessageAt: string;
    topContributors: {
      userId: string;
      messageCount: number;
    }[];
  };
}
```

#### Get Unread States
```typescript
GET /api/channels/unread

Response:
interface UnreadStatesResponse {
  channels: {
    channelId: string;
    unreadCount: number;
    mentionCount: number;
    lastReadMessageId: string;
    lastMessageAt: string;
  }[];
}
```

#### Mark Channel as Read
```typescript
POST /api/channels/:channelId/read
Body: {
  lastReadMessageId: string;
  timestamp: number;
}
```

### WebSocket Events

#### Activity Level Updates
```typescript
// Event: channel:activity
interface ChannelActivityUpdate {
  channelId: string;
  activityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  metrics: {
    messagesLast24h: number;
    uniqueUsers24h: number;
    lastMessageAt: string;
  };
}
```

#### Unread State Updates
```typescript
// Event: channel:unread
interface UnreadUpdate {
  channelId: string;
  userId: string;
  unreadCount: number;
  mentionCount: number;
  lastReadMessageId: string;
}
```

#### Mention Updates
```typescript
// Event: channel:mention
interface MentionEvent {
  channelId: string;
  messageId: string;
  mentionedUsers: string[];
  messagePreview: string;
  authorId: string;
}
```

## Implementation Requirements

### Activity Tracking
1. Real-time Metrics
   - Message frequency
   - User activity
   - Response times
   - Peak usage periods

2. Historical Data
   - Daily aggregates
   - Weekly trends
   - Monthly reports
   - User engagement metrics

### Unread State Management
1. Storage Requirements
   - Per-user read positions
   - Message counters
   - Mention tracking
   - Last read timestamps

2. Performance Optimization
   - Batch updates
   - Efficient counters
   - Cache frequently accessed data
   - Minimize database load

## Data Storage

### Redis Schema
```typescript
// Channel Activity
channel:activity:{channelId} = {
  messageCount24h: number;
  uniqueUsers24h: string[];
  lastMessageAt: timestamp;
}

// Unread Counters
channel:unread:{channelId}:{userId} = {
  count: number;
  mentions: number;
  lastRead: string;
}
```

### Database Schema
```typescript
interface ChannelActivity {
  channelId: string;
  date: Date;
  messageCount: number;
  uniqueUsers: number;
  peakHour: number;
  avgResponseTime: number;
}

interface UserReadState {
  userId: string;
  channelId: string;
  lastReadMessageId: string;
  lastReadAt: Date;
  unreadCount: number;
  mentionCount: number;
}
```

## Performance Considerations

1. Caching Strategy
   - Cache hot channels
   - Cache user read states
   - Cache activity metrics
   - Implement LRU eviction

2. Batch Processing
   - Aggregate updates
   - Bulk counter updates
   - Periodic persistence
   - Background processing

3. Scale Considerations
   - Shard by channel
   - Distribute counters
   - Handle high message volume
   - Optimize for read performance

## Error Handling

1. Data Consistency
   - Handle race conditions
   - Validate counter updates
   - Ensure read state integrity
   - Handle missed updates

2. Recovery Procedures
   - Counter reconciliation
   - State reconstruction
   - Data repair utilities
   - Backup procedures

## Security

1. Access Control
   - Validate channel access
   - Check read permissions
   - Protect sensitive metrics
   - Audit access patterns

2. Rate Limiting
   - Limit update frequency
   - Protect counter updates
   - Prevent abuse
   - Monitor usage patterns

## Monitoring

1. Metrics
   - Counter accuracy
   - Update latency
   - Cache hit rates
   - Error rates

2. Alerts
   - Counter discrepancies
   - High error rates
   - Performance degradation
   - Unusual patterns 