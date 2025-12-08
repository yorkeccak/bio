import { NextResponse } from 'next/server';

/**
 * Internal proxy for Valyu API calls
 * Forwards requests to Valyu Platform's OAuth proxy which:
 * - Validates the user's OAuth token
 * - Uses the user's org API key
 * - Deducts from the user's org credits
 */
export async function POST(request: Request) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    const body = await request.json();
    const { path, method, body: requestBody } = body;

    if (!path) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Missing path parameter' },
        { status: 400 }
      );
    }

    // Get Valyu Platform OAuth proxy URL
    const valyuAppUrl = process.env.VALYU_APP_URL || 'https://platform.valyu.ai';
    const proxyUrl = `${valyuAppUrl}/api/oauth/proxy`;

    console.log('[Valyu Proxy] Forwarding request to:', path);

    // Forward request to Valyu Platform
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path,
        method: method || 'POST',
        body: requestBody,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Valyu Proxy] Error from Valyu:', response.status, errorText);

      // Try to parse error as JSON
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      return NextResponse.json(
        { error: 'proxy_error', message: errorData.message || 'Request failed', details: errorData },
        { status: response.status }
      );
    }

    // Return response from Valyu
    const responseData = await response.json();
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[Valyu Proxy] Error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
