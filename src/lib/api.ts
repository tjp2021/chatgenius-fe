import { auth } from "@clerk/nextjs";
import { SearchUsersResponse } from "@/types/user";

export const searchUsers = async (
  search: string,
  page: number = 1,
  limit: number = 10
): Promise<SearchUsersResponse> => {
  console.log('searchUsers called with:', { search, page, limit });
  
  const token = await auth().getToken();
  console.log('Got auth token:', token?.slice(0, 10) + '...');
  
  const url = `${process.env.NEXT_PUBLIC_API_URL}/users/search?search=${search}&page=${page}&limit=${limit}`;
  console.log('Making request to:', url);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Failed to search users: ${response.status}`);
    }

    const data = await response.json();
    console.log('Response data:', data);
    return data;
  } catch (err) {
    console.error('Search error:', err);
    throw err;
  }
}; 