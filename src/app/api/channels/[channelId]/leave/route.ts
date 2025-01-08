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

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/channels/${channelId}/leave`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userId}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      if (response.status === 401) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
      if (response.status === 403) {
        return new NextResponse("Channel owner cannot leave", { status: 403 });
      }
      if (response.status === 404) {
        return new NextResponse("Channel not found", { status: 404 });
      }
      return new NextResponse("Failed to leave channel", { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[CHANNEL_LEAVE_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 