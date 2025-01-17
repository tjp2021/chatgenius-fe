import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { SearchUsersResponse } from '@/types/user';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchUsersResponse | { error: string }>
) {
  const { userId } = await getAuth(req);  // Use getAuth helper from Clerk

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { query: searchQuery, page = '1', limit = '10' } = req.query;

  if (!searchQuery || typeof searchQuery !== 'string') {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const response = await fetch(
      `${process.env.API_URL}/users/search?query=${searchQuery}&page=${page}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${req.headers.authorization}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend search error:', errorData);
      return res.status(response.status).json({ error: errorData.message || 'Failed to search users' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Failed to search users' });
  }
} 