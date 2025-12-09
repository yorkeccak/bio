/**
 * Valyu OAuth 2.1 Client Library with PKCE
 * Handles "Sign in with Valyu" authentication flow
 */

// OAuth 2.1 Configuration
const VALYU_OAUTH_CONFIG = {
  // Valyu Platform's Supabase is the OAuth provider
  get authorizationEndpoint() {
    const supabaseUrl = process.env.NEXT_PUBLIC_VALYU_SUPABASE_URL;
    if (!supabaseUrl) throw new Error('NEXT_PUBLIC_VALYU_SUPABASE_URL is required');
    return `${supabaseUrl}/auth/v1/oauth/authorize`;
  },
  get tokenEndpoint() {
    const supabaseUrl = process.env.NEXT_PUBLIC_VALYU_SUPABASE_URL;
    if (!supabaseUrl) throw new Error('NEXT_PUBLIC_VALYU_SUPABASE_URL is required');
    return `${supabaseUrl}/auth/v1/oauth/token`;
  },
  get userInfoEndpoint() {
    const valyuAppUrl = process.env.VALYU_APP_URL || 'https://platform.valyu.ai';
    return `${valyuAppUrl}/api/oauth/userinfo`;
  },
  get clientId() {
    const clientId = process.env.NEXT_PUBLIC_VALYU_CLIENT_ID;
    if (!clientId) throw new Error('NEXT_PUBLIC_VALYU_CLIENT_ID is required');
    return clientId;
  },
  scopes: ['openid', 'email', 'profile'],
};

// Storage keys for PKCE state
const PKCE_STORAGE_KEY = 'valyu_oauth_pkce';
const TOKEN_STORAGE_KEY = 'valyu_oauth_tokens';

// Types
export interface ValyuTokens {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

export interface ValyuUserInfo {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  user_type?: 'buyer' | 'seller';
  organisation_id?: string;
  organisation_name?: string;
}

interface PKCEState {
  codeVerifier: string;
  state: string;
  redirectUri: string;
}

// PKCE Helpers
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => charset[byte % charset.length]).join('');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest('SHA-256', data);
}

function base64URLEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function generateCodeVerifier(): string {
  return generateRandomString(64);
}

export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const hashed = await sha256(codeVerifier);
  return base64URLEncode(hashed);
}

export function generateState(): string {
  return generateRandomString(32);
}

// Storage helpers
function savePKCEState(state: PKCEState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify(state));
}

function loadPKCEState(): PKCEState | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(PKCE_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function clearPKCEState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PKCE_STORAGE_KEY);
}

export function saveValyuTokens(tokens: ValyuTokens): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

export function loadValyuTokens(): ValyuTokens | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearValyuTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function isTokenExpired(tokens: ValyuTokens): boolean {
  // Add 30 second buffer
  return Date.now() >= tokens.expiresAt - 30000;
}

// OAuth Flow Functions

/**
 * Build the authorization URL for initiating OAuth flow
 */
export async function buildAuthorizationUrl(): Promise<string> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Build redirect URI
  const redirectUri = `${window.location.origin}/auth/valyu/callback`;

  // Save PKCE state for validation on callback
  savePKCEState({
    codeVerifier,
    state,
    redirectUri,
  });

  // Build authorization URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: VALYU_OAUTH_CONFIG.clientId,
    redirect_uri: redirectUri,
    scope: VALYU_OAUTH_CONFIG.scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    // Track which app the user came from
    utm_source: 'bio.valyu.ai',
  });

  return `${VALYU_OAUTH_CONFIG.authorizationEndpoint}?${params.toString()}`;
}

/**
 * Validate the callback and return the authorization code
 */
export function validateCallback(callbackParams: URLSearchParams): {
  code: string;
  codeVerifier: string;
  redirectUri: string;
} | { error: string } {
  const code = callbackParams.get('code');
  const state = callbackParams.get('state');
  const error = callbackParams.get('error');
  const errorDescription = callbackParams.get('error_description');

  if (error) {
    return { error: errorDescription || error };
  }

  if (!code) {
    return { error: 'No authorization code received' };
  }

  if (!state) {
    return { error: 'No state parameter received' };
  }

  // Load and validate PKCE state
  const pkceState = loadPKCEState();
  if (!pkceState) {
    return { error: 'No PKCE state found - please start the login flow again' };
  }

  if (pkceState.state !== state) {
    clearPKCEState();
    return { error: 'State mismatch - possible CSRF attack' };
  }

  // Clear PKCE state (it's single use)
  clearPKCEState();

  return {
    code,
    codeVerifier: pkceState.codeVerifier,
    redirectUri: pkceState.redirectUri,
  };
}

/**
 * Exchange authorization code for tokens via server-side endpoint
 * The server handles the actual exchange to keep client_secret secure
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<{ tokens: ValyuTokens } | { error: string }> {
  try {
    const response = await fetch('/api/auth/valyu/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Token exchange failed' };
    }

    const data = await response.json();

    const tokens: ValyuTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
    };

    // Save tokens to localStorage
    saveValyuTokens(tokens);

    return { tokens };
  } catch (err) {
    console.error('[Valyu OAuth] Token exchange error:', err);
    return { error: 'Network error during token exchange' };
  }
}

/**
 * Get the current valid access token, refreshing if necessary
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = loadValyuTokens();
  if (!tokens) return null;

  if (!isTokenExpired(tokens)) {
    return tokens.accessToken;
  }

  // Token expired, try to refresh
  const refreshResult = await refreshAccessToken(tokens.refreshToken);
  if ('error' in refreshResult) {
    // Refresh failed, clear tokens
    clearValyuTokens();
    return null;
  }

  return refreshResult.tokens.accessToken;
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ tokens: ValyuTokens } | { error: string }> {
  try {
    const response = await fetch('/api/auth/valyu/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Token refresh failed' };
    }

    const data = await response.json();

    const tokens: ValyuTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Some providers don't rotate refresh tokens
      idToken: data.id_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
    };

    // Save updated tokens
    saveValyuTokens(tokens);

    return { tokens };
  } catch (err) {
    console.error('[Valyu OAuth] Token refresh error:', err);
    return { error: 'Network error during token refresh' };
  }
}

/**
 * Call the Valyu API proxy with the user's OAuth token
 * This routes API calls through Valyu Platform which uses the user's org credits
 */
export async function proxyValyuApi(
  path: string,
  method: string,
  body?: any,
  accessToken?: string
): Promise<any> {
  const token = accessToken || await getValidAccessToken();

  if (!token) {
    throw new Error('No valid Valyu access token available');
  }

  const proxyUrl = process.env.NEXT_PUBLIC_VALYU_PROXY_URL || '/api/valyu-proxy';

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path,
      method,
      body,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `API call failed: ${response.status}`);
  }

  return response.json();
}
