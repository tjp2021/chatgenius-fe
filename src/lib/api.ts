import { SearchUsersResponse } from "@/types/user";
import { BaseSearchResponse } from "@/types/search";
import axios, { AxiosError } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

interface SearchParams {
  query: string;
  sortBy?: {
    field: string;
    order: 'asc' | 'desc';
  };
  cursor?: string;
}

interface ChannelSearchParams {
  channelId: string;
  query: string;
  token: string;
  userId: string;
  limit?: number;
  minScore?: number;
  cursor?: string;
  dateRange?: string;
}

export const searchUsers = async (
  search: string,
  token: string,
  page: number = 1,
  limit: number = 10
): Promise<SearchUsersResponse> => {
  const response = await axiosInstance.get('/users/search', {
    params: { search, page, limit },
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.data;
};

export const getCurrentUser = async (token: string) => {
  const response = await axiosInstance.get('/users/me', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.data;
};

export const updateUser = async (
  token: string,
  userData: {
    name?: string;
    email?: string;
    imageUrl?: string;
  }
) => {
  const response = await axiosInstance.patch('/users/me', userData, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.data;
};

export const channelSearch = async ({
  channelId,
  query,
  token,
  userId,
  limit,
  minScore,
  cursor,
  dateRange
}: ChannelSearchParams): Promise<any> => {
  const response = await axiosInstance.post('/search/semantic', 
    {
      query,
      channelId
    },
    {
      params: {
        limit,
        minScore,
        cursor,
        dateRange
      },
      headers: {
        Authorization: `Bearer ${token}`,
        'X-User-ID': userId
      }
    }
  );

  return response.data;
};

// Export API functions
export const api = {
  searchUsers,
  getCurrentUser,
  updateUser,
  channelSearch
}; 