import { auth } from "@clerk/nextjs";
import { SearchUsersResponse } from "@/types/user";

export const searchUsers = async (
  search: string,
  page = 1,
  limit = 10
): Promise<SearchUsersResponse> => {
  const token = await auth().getToken();
  
  const url = `${process.env.NEXT_PUBLIC_API_URL}/users/search?query=${search}&page=${page}&limit=${limit}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to search users: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Search error:', err);
    throw err;
  }
};

export const getCurrentUser = async () => {
  const token = await auth().getToken();
  
  const url = `${process.env.NEXT_PUBLIC_API_URL}/users/me`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get current user: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Get current user error:', err);
    throw err;
  }
};

export const updateUser = async (userData: { name: string }) => {
  const token = await auth().getToken();
  
  const url = `${process.env.NEXT_PUBLIC_API_URL}/users/me`;

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update user: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Update user error:', err);
    throw err;
  }
};

export const api = {
  searchUsers,
  getCurrentUser,
  updateUser
}; 