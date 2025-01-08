import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

export async function POST(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const { userId } = auth();
    const { channelId } = params;
    const { content, deviceId } = await req.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels/${channelId}/draft`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userId}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, deviceId }),
    });

    if (!response.ok) {
      const error = await response.json();
      return new NextResponse(error.message, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[CHANNEL_DRAFT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const { userId } = auth();
    const { channelId } = params;
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/channels/${channelId}/draft${deviceId ? `?deviceId=${deviceId}` : ''}`,
      {
        headers: {
          'Authorization': `Bearer ${userId}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return new NextResponse(error.message, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[CHANNEL_DRAFT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const { userId } = auth();
    const { channelId } = params;
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/channels/${channelId}/draft${deviceId ? `?deviceId=${deviceId}` : ''}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userId}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return new NextResponse(error.message, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CHANNEL_DRAFT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 