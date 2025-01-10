import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, description, type, members } = body;

    // Make API call to your backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await auth().getToken()}`
      },
      body: JSON.stringify({
        name,
        description,
        type: type.toUpperCase(),
        members: members || []
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create channel');
    }

    const channel = await response.json();
    return NextResponse.json(channel);

  } catch (error) {
    console.error('[CHANNELS_POST]', error);
    return new NextResponse(error instanceof Error ? error.message : "Internal Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels`, {
      headers: {
        'Authorization': `Bearer ${await auth().getToken()}`
      }
    });

    const channels = await response.json();
    return NextResponse.json(channels);

  } catch (error) {
    console.error("[CHANNELS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 