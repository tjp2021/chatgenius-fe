import { api } from "@/lib/axios";

// Common Types
export interface MessageMetadata {
  channelId: string;
  userId: string;
  timestamp: string;
  scores: {
    semantic: number;
    time: number;
    channel: number;
    thread: number;
    final: number;
  };
}

export interface MessageUser {
  id: string;
  name: string;
  role: string;
}

export interface ThreadInfo {
  threadId: string;
  replyCount: number;
  participantCount: number;
  lastActivity: string;
  status: string;
}

export interface MessageContent {
  id: string;
  content: string;
  metadata: MessageMetadata;
  score: number;
  user: MessageUser;
  thread?: ThreadInfo;
}

export interface PaginationInfo {
  hasNextPage: boolean;
  cursor?: string;
  total: number;
}

export interface SearchMetadata {
  searchTime: number;
  totalMatches: number;
  contextQuality?: number;
}

// Request Types
export interface BaseSearchRequest {
  query: string;
  limit?: number;
  cursor?: string;
  minScore?: number;
  dateRange?: {
    start?: string;
    end?: string;
  };
}

export interface SemanticSearchRequest extends BaseSearchRequest {
  sortBy?: {
    field: "score" | "time";
    order: "asc" | "desc";
  };
}

export interface ChannelSearchRequest extends BaseSearchRequest {
  threadOptions?: {
    include: boolean;
    expand: boolean;
    maxReplies?: number;
  };
}

export interface UserSearchRequest extends BaseSearchRequest {
  channelId?: string;
}

export interface RAGSearchRequest {
  query: string;
  format?: "text" | "markdown" | "html";
  maxTokens?: number;
  temperature?: number;
  channelId?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
}

// Response Types
export interface BaseSearchResponse {
  items: MessageContent[];
  metadata: SearchMetadata;
  pageInfo: PaginationInfo;
}

export interface RAGResponse {
  response: string;
  contextMessageCount: number;
  metadata: {
    searchTime: number;
    contextQuality: number;
  };
}

// Legacy types for backward compatibility
export interface Message extends MessageContent {}
export interface PageInfo extends PaginationInfo {}
export interface SearchRequest extends SemanticSearchRequest {
  userId: string;
  filter?: {
    channelId?: { $eq: string };
    $or?: Array<{ messageId: string } | { replyToId: string }>;
  };
}
export interface SearchResponse extends BaseSearchResponse {}

// API Functions
export const searchMessages = async (
  query: string,
  userId: string,
  filter?: SearchRequest['filter']
): Promise<SearchResponse> => {
  const response = await api.post<SearchResponse>('/search', {
    query,
    userId,
    filter,
  });
  return response.data;
};

// New API Functions
export const semanticSearch = async (
  request: SemanticSearchRequest
): Promise<BaseSearchResponse> => {
  const response = await api.post<BaseSearchResponse>('/search/semantic', request);
  return response.data;
};

export const channelSearch = async (
  channelId: string,
  request: ChannelSearchRequest
): Promise<BaseSearchResponse> => {
  const response = await api.post<BaseSearchResponse>(`/search/channel/${channelId}`, request);
  return response.data;
};

export const userSearch = async (
  userId: string,
  request: UserSearchRequest
): Promise<BaseSearchResponse> => {
  const response = await api.post<BaseSearchResponse>(`/search/user/${userId}`, request);
  return response.data;
};

export const ragSearch = async (
  request: RAGSearchRequest
): Promise<RAGResponse> => {
  const response = await api.post<RAGResponse>('/search/rag', request);
  return response.data;
}; 