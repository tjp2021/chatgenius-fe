import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { getToken } = auth();
    const token = await getToken();

    return NextResponse.json({ authToken: token });
  } catch (error) {
    console.error('[AUTH_TOKEN_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 