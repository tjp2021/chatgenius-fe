import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

export async function POST(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const token = await auth().getToken();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels/${params.channelId}/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      return new NextResponse(error.message || 'Failed to join channel', { 
        status: response.status 
      });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("[CHANNEL_JOIN]", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Internal Error", 
      { status: 500 }
    );
  }
} 