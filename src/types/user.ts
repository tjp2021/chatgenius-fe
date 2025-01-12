// Basic user type for message sender information
export interface User {
  id: string;
  name: string;
  username?: string;
  imageUrl?: string;
} 

export interface SearchUsersResponse {
  users: {
    id: string;
    name: string | null;
    imageUrl: string | null;
    isOnline: boolean;
  }[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
} 