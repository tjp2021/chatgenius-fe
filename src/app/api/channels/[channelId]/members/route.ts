import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

export async function GET(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const { userId } = auth();
    const { channelId } = params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/channels/${channelId}/members`, {
      headers: {
        'Authorization': `Bearer ${userId}`,
        'Content-Type': 'application/json',
      },
      next: {
        revalidate: 60 // Cache for 1 minute as per PRD
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
      if (response.status === 403) {
        return new NextResponse("Not a member of this channel", { status: 403 });
      }
      if (response.status === 404) {
        return new NextResponse("Channel not found", { status: 404 });
      }
      return new NextResponse("Failed to fetch channel members", { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[CHANNEL_MEMBERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 