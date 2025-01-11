import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// GET handler for messages
export async function GET(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  console.log('[Messages API] Route config:', {
    dynamic: 'force-dynamic',
    runtime: 'nodejs',
    params
  });

  console.log('[Messages API] Received GET request for channel messages', { 
    channelId: params.channelId,
    url: req.url,
    headers: Object.fromEntries(headers())
  });

  try {
    const { userId, getToken } = auth();
    
    if (!userId) {
      console.log('[Messages API] No user ID found');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No user ID found' },
        { status: 401 }
      );
    }

    const token = await getToken();
    
    if (!token) {
      console.log('[Messages API] No token available');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No token available' },
        { status: 401 }
      );
    }

    console.log('[Messages API] Auth successful', { 
      userId,
      hasToken: !!token
    });

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      console.error('[Messages API] API URL not configured');
      return NextResponse.json(
        { error: 'Configuration Error', message: 'API URL not configured' },
        { status: 500 }
      );
    }

    // Ensure URL has correct format
    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const url = `${baseUrl}/messages/channel/${params.channelId}`;
    console.log('[Messages API] Fetching messages from backend API:', { url });

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('[Messages API] Backend API response received', {
      status: response.status
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Messages API] Backend API error:', {
        status: response.status,
        error: errorText,
        url,
        channelId: params.channelId,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // Special handling for 404
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Channel or messages not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Backend Error', message: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Messages API] Backend API success', {
      messageCount: data.messages?.length || 0
    });

    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error('[Messages API] Error details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }
} 