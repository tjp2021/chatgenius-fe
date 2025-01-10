// These are the types we expect from the API responses
export interface APIResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface APIErrorResponse {
  success: false;
  error: string;
}

// API Routes (matching the backend API)
export const API_ROUTES = {
  // Auth
  AUTH_TOKEN: '/api/auth/token',
  
  // Channels
  CHANNELS: '/api/channels',
  CHANNEL_MESSAGES: (channelId: string) => `/api/channels/${channelId}/messages`,
  
  // Messages
  MESSAGES: '/api/messages',
  
  // Users
  USERS: '/api/users',
  USER_PRESENCE: '/api/users/presence'
} as const;

// Socket Events (matching backend socket events)
export enum SocketEvents {
  /* MESSAGE_NEW = 'message:new',
  MESSAGE_SENT = 'message:sent',
  TYPING_START = 'typing:start',
  TYPING_STOP = 'typing:stop' */
} 

export const MessageEvents = {
  /* MESSAGE_NEW: 'message:new',
  MESSAGE_SENT: 'message:sent',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop' */
}; 