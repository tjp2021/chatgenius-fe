import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@/lib/axios';

export async function GET(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const response = await api.get(`/messages/channel/${params.channelId}`);
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Failed to fetch messages:', error);
    return new NextResponse(
      error.response?.data?.message || 'Failed to fetch messages',
      { status: error.response?.status || 500 }
    );
  }
} 