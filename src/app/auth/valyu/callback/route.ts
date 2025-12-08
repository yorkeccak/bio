import { NextResponse } from 'next/server';

/**
 * OAuth callback handler for "Sign in with Valyu"
 * This receives the authorization code from Valyu Platform OAuth
 * and redirects to the client completion page
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // Get OAuth response parameters
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Build redirect URL with all params for client-side processing
  const completeUrl = new URL('/auth/valyu/complete', origin);

  if (error) {
    completeUrl.searchParams.set('error', error);
    if (errorDescription) {
      completeUrl.searchParams.set('error_description', errorDescription);
    }
    console.error('[Valyu OAuth Callback] Error:', error, errorDescription);
    return NextResponse.redirect(completeUrl);
  }

  if (!code) {
    completeUrl.searchParams.set('error', 'no_code');
    completeUrl.searchParams.set('error_description', 'No authorization code received');
    console.error('[Valyu OAuth Callback] No code received');
    return NextResponse.redirect(completeUrl);
  }

  // Pass code and state to client for PKCE validation and token exchange
  completeUrl.searchParams.set('code', code);
  if (state) {
    completeUrl.searchParams.set('state', state);
  }

  console.log('[Valyu OAuth Callback] Redirecting to complete page with code');
  return NextResponse.redirect(completeUrl);
}
