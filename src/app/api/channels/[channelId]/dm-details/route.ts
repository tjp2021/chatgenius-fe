import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels/${params.channelId}/dm-details`, {
      headers: {
        'Authorization': `Bearer ${await auth().getToken()}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      return new NextResponse(error.message || 'Failed to fetch DM details', { 
        status: response.status 
      });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[DM_DETAILS_GET]', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Error', 
      { status: 500 }
    );
  }
} 