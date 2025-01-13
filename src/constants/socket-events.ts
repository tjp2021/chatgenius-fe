export const SOCKET_EVENTS = {
  MESSAGE: {
    NEW: 'message:new',
    RECEIVED: 'message:received',
    SEND: 'message:send',
    CONFIRM: 'message:confirm',
    DELIVERED: 'message:delivered',
    CREATED: 'message:created',
    FAILED: 'message:failed',
    READ: 'message:read',
    REACTION_ADDED: 'message:reaction:added',
    REACTION_RECEIVED: 'message:reaction:received'
  },
  CHANNEL: {
    JOIN: 'channel:join',
    JOINED: 'channel:joined',
    LEAVE: 'channel:leave',
    LEFT: 'channel:left',
    ERROR: 'channel:error',
    CREATED: 'channel:created',
    UPDATED: 'channel:updated',
    DELETED: 'channel:deleted'
  },
  THREAD: {
    JOIN: 'thread:join',
    JOINED: 'thread:joined',
    LEAVE: 'thread:leave',
    LEFT: 'thread:left',
    REPLY: 'thread:reply',
    REPLY_DELIVERED: 'thread:reply:delivered',
    REPLY_CREATED: 'thread:reply:created',
    REPLY_FAILED: 'thread:reply:failed',
    UPDATED: 'thread:updated'
  },
  ROOM: {
    MEMBER_JOINED: 'room:member:joined',
    MEMBER_LEFT: 'room:member:left',
    ACTIVITY: 'room:activity'
  },
  TYPING: {
    START: 'typing:start',
    STOP: 'typing:stop'
  }
} as const; 