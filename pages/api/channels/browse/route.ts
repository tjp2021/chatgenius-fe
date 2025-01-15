import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { getToken } = auth();
    const token = await getToken();

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels?view=browse`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch channels');
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[CHANNELS_BROWSE]', error);
    return new NextResponse(
      'Failed to fetch channels', 
      { status: 500 }
    );
  }
} 