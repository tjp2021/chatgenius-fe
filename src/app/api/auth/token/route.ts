import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { env } from '@/env.mjs';

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate Clerk token with backend
    const response = await fetch(`${env.NEXT_PUBLIC_APP_URL}/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.headers.get('authorization')?.split(' ')[1]}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Token validation failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      token: req.headers.get('authorization')?.split(' ')[1], // Use Clerk token as JWT
      user: data.user
    });
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Rate limiting configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}; 