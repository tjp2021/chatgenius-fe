import { Message } from './message';

export interface BaseSearchResponse {
  items: Message[];
  pageInfo: {
    total: number;
    hasNextPage: boolean;
    cursor?: string;
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