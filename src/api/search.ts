import { api } from "@/lib/axios";

export interface Message {
  id: string;
  content: string;
  channelId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deliveryStatus: string;
  replyToId: string | null;
  vectorId: string | null;
  user: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
  score: number;
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string;
}

export interface SearchResponse {
  items: Message[];
  pageInfo: PageInfo;
  total: number;
}

export interface SearchRequest {
  query: string;
  userId: string;
  filter?: {
    channelId?: { $eq: string };
    $or?: Array<{ messageId: string } | { replyToId: string }>;
  };
}

export const searchMessages = async (query: string, userId: string, filter?: SearchRequest['filter']): Promise<SearchResponse> => {
  const response = await api.post<SearchResponse>('/search', {
    query,
    userId,
    filter
  });
  return response.data;
}; 