import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

export async function POST(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const { userId } = auth();
    const { channelId } = params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/channels/${channelId}/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userId}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store' // Don't cache mutation requests
    });

    if (!response.ok) {
      if (response.status === 401) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
      if (response.status === 403) {
        return new NextResponse("Access denied", { status: 403 });
      }
      if (response.status === 404) {
        return new NextResponse("Channel not found", { status: 404 });
      }
      if (response.status === 409) {
        return new NextResponse("Already a member of this channel", { status: 409 });
      }
      return new NextResponse("Failed to join channel", { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[CHANNEL_JOIN_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 