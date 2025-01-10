import { getAuth, clerkClient } from "@clerk/nextjs/server";
import type { NextApiRequest, NextApiResponse } from 'next';
import { SearchUsersResponse } from "@/types/user";
import { withAuth } from "@clerk/nextjs/api";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { userId } = req.auth;  // Get authenticated user ID
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const searchTerm = encodeURIComponent(req.query.search as string);
    const url = `${process.env.NEXT_PUBLIC_API_URL}/users/search?search=${searchTerm}&page=${req.query.page || 1}&limit=${req.query.limit || 10}`;
    
    // Get session token
    const session = await clerkClient.sessions.getSession(req.auth.sessionId);
    const token = session.token;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to search users');
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Failed to search users' });
  }
}

// Wrap the handler with Clerk's auth middleware
export default withAuth(handler); 