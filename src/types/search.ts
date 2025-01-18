import { Message } from './message';

export interface BaseSearchResponse {
  items: Array<{
    id: string;
    content: string;
    score: number;
    metadata: {
      timestamp: string;
      [key: string]: any;
    };
    user: {
      id: string;
      name: string;
    };
  }>;
  pageInfo: {
    hasNextPage: boolean;
    cursor?: string;
    total: number;
  };
}

export interface SearchMetadata {
  messageId: string;
  channelId: string;
  userId: string;
  timestamp: number;
  replyToId?: string;
  threadId?: string;
  chunkIndex?: number;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: SearchMetadata;
  vector?: number[];
} 