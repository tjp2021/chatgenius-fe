import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { env } from '@/env.mjs';

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    const body = await request.json();
    const { clerkToken } = body;
    
    if (!userId || !clerkToken) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Validate the Clerk token matches the current session
    const currentToken = await auth().getToken();
    if (clerkToken !== currentToken) {
      return new NextResponse('Invalid token', { status: 401 });
    }

    // Create a JWT token
    const token = await new SignJWT({ 
      sub: userId,
      type: 'access'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(env.SUPABASE_JWT_SECRET));

    // Return both token and user info
    return NextResponse.json({ 
      token,
      user: {
        id: userId,
        // Add any other user info you want to return
      }
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
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