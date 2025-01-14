import { api } from "@/lib/axios";

export interface SearchResult {
  messageId: string;
  content: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
}

export const searchMessages = async (query: string): Promise<SearchResponse> => {
  const response = await api.post<SearchResponse>('/search', {
    query
  });
  return response.data;
}; 