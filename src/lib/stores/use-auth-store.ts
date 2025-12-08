'use client';

import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createClient } from '@/utils/supabase/client-wrapper';
import { track } from '@vercel/analytics';
import {
  buildAuthorizationUrl,
  loadValyuTokens,
  saveValyuTokens,
  clearValyuTokens,
  isTokenExpired,
  getValidAccessToken,
  ValyuTokens,
} from '@/lib/valyu-oauth';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  // Valyu OAuth tokens
  valyuAccessToken: string | null;
  valyuRefreshToken: string | null;
  valyuTokenExpiresAt: number | null;
  // Valyu API status
  hasApiKey: boolean;
  creditsAvailable: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  // Valyu OAuth methods
  signInWithValyu: () => Promise<{ data?: any; error?: any }>;
  completeValyuAuth: (
    idToken: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ) => Promise<{ success: boolean; error?: string }>;
  setValyuTokens: (accessToken: string, refreshToken: string, expiresIn: number) => void;
  getValyuAccessToken: () => string | null;
  setApiKeyStatus: (hasApiKey: boolean, creditsAvailable: boolean) => void;
  fetchApiKeyStatus: (accessToken: string) => Promise<void>;
  // Sign out
  signOut: () => Promise<{ error?: any }>;
  initialize: () => void;
}

type AuthStore = AuthState & AuthActions;

// Load Valyu tokens from localStorage on startup
function loadInitialValyuTokens(): { accessToken: string | null; refreshToken: string | null; expiresAt: number | null } {
  if (typeof window === 'undefined') {
    return { accessToken: null, refreshToken: null, expiresAt: null };
  }
  const tokens = loadValyuTokens();
  if (tokens && !isTokenExpired(tokens)) {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    };
  }
  return { accessToken: null, refreshToken: null, expiresAt: null };
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      loading: true,
      initialized: false,
      valyuAccessToken: null,
      valyuRefreshToken: null,
      valyuTokenExpiresAt: null,
      hasApiKey: false,
      creditsAvailable: false,

      // Actions
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      setInitialized: (initialized) => set({ initialized }),

      // Sign in with Valyu OAuth
      signInWithValyu: async () => {
        try {
          // Build authorization URL and redirect
          const authUrl = await buildAuthorizationUrl();
          window.location.href = authUrl;
          return { data: { redirecting: true } };
        } catch (error) {
          console.error('[Auth] Valyu sign in error:', error);
          return { error };
        }
      },

      // Complete Valyu auth after OAuth callback
      completeValyuAuth: async (idToken, accessToken, refreshToken, expiresIn) => {
        try {
          // Save Valyu tokens to state and localStorage
          const expiresAt = Date.now() + (expiresIn * 1000);
          saveValyuTokens({
            accessToken,
            refreshToken,
            idToken,
            expiresAt,
          });
          set({
            valyuAccessToken: accessToken,
            valyuRefreshToken: refreshToken,
            valyuTokenExpiresAt: expiresAt,
          });

          // Create local session via API
          const sessionResponse = await fetch('/api/auth/valyu/session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              access_token: accessToken,
              id_token: idToken,
            }),
          });

          if (!sessionResponse.ok) {
            const error = await sessionResponse.json();
            return { success: false, error: error.message || 'Session creation failed' };
          }

          const sessionData = await sessionResponse.json();

          // Track new vs returning user
          track('Valyu Auth Session Created', {
            is_new_user: sessionData.is_new_user,
            has_organisation: !!sessionData.user?.valyu_organisation_name,
          });

          // Use magic link to create local Supabase session
          if (sessionData.magic_link_url) {
            // Extract token from magic link and verify it
            const supabase = createClient();

            // The magic link URL contains the token - we need to verify it
            const url = new URL(sessionData.magic_link_url);
            const token = url.searchParams.get('token') || sessionData.magic_link_token;

            if (token) {
              const { data, error: verifyError } = await supabase.auth.verifyOtp({
                token_hash: token,
                type: 'magiclink',
              });

              if (verifyError) {
                console.error('[Auth] Magic link verification failed:', verifyError);
                // Continue anyway - Valyu tokens are still valid for API calls
              } else {
                console.log('[Auth] Local session created successfully');
                set({ user: data.user });
              }
            }
          }

          // Fetch API key status
          await get().fetchApiKeyStatus(accessToken);

          return { success: true };
        } catch (error: any) {
          console.error('[Auth] Complete Valyu auth error:', error);
          return { success: false, error: error.message || 'Unknown error' };
        }
      },

      // Set Valyu tokens
      setValyuTokens: (accessToken, refreshToken, expiresIn) => {
        const expiresAt = Date.now() + (expiresIn * 1000);
        saveValyuTokens({
          accessToken,
          refreshToken,
          expiresAt,
        });
        set({
          valyuAccessToken: accessToken,
          valyuRefreshToken: refreshToken,
          valyuTokenExpiresAt: expiresAt,
        });
      },

      // Get valid Valyu access token (async, handles refresh)
      getValyuAccessToken: () => {
        const state = get();
        if (!state.valyuAccessToken) return null;

        // Check if token is expired
        if (state.valyuTokenExpiresAt && Date.now() >= state.valyuTokenExpiresAt - 30000) {
          // Token expired, need to refresh - return null for now
          // The caller should handle token refresh
          return null;
        }

        return state.valyuAccessToken;
      },

      // Fetch API key status from Valyu
      fetchApiKeyStatus: async (accessToken: string) => {
        try {
          const valyuAppUrl = process.env.NEXT_PUBLIC_VALYU_APP_URL || 'https://platform.valyu.ai';
          const response = await fetch(`${valyuAppUrl}/api/oauth/status`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            set({
              hasApiKey: data.hasApiKey || false,
              creditsAvailable: data.creditsAvailable || false,
            });
          }
        } catch (error) {
          console.error('[Auth] Failed to fetch API key status:', error);
        }
      },

      // Set API key status
      setApiKeyStatus: (hasApiKey, creditsAvailable) => {
        set({ hasApiKey, creditsAvailable });
      },

      signOut: async () => {
        const supabase = createClient();

        try {
          // Sign out from local Supabase
          const result = await supabase.auth.signOut();

          // Clear Valyu tokens
          clearValyuTokens();
          set({
            valyuAccessToken: null,
            valyuRefreshToken: null,
            valyuTokenExpiresAt: null,
            hasApiKey: false,
            creditsAvailable: false,
            user: null,
          });

          return result;
        } catch (error) {
          return { error };
        }
      },

      initialize: () => {
        if (get().initialized) return;

        // Mark as initializing to prevent multiple calls
        set({ initialized: true });

        const supabase = createClient();

        // Load Valyu tokens from localStorage
        const initialTokens = loadInitialValyuTokens();
        if (initialTokens.accessToken) {
          set({
            valyuAccessToken: initialTokens.accessToken,
            valyuRefreshToken: initialTokens.refreshToken,
            valyuTokenExpiresAt: initialTokens.expiresAt,
          });
        }

        // Failsafe: if nothing happens in 3 seconds, stop loading
        const timeoutId = setTimeout(() => {
          set({ loading: false });
        }, 3000);

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
          clearTimeout(timeoutId);
          set({
            user: session?.user ?? null,
            loading: false
          });
        }).catch((error: unknown) => {
          clearTimeout(timeoutId);
          set({
            user: null,
            loading: false
          });
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event: AuthChangeEvent, session: Session | null) => {

            set({
              user: session?.user ?? null,
              loading: false
            });

            // Handle sign out event
            if (event === 'SIGNED_OUT') {
              // Clear Valyu tokens
              clearValyuTokens();
              set({
                valyuAccessToken: null,
                valyuRefreshToken: null,
                valyuTokenExpiresAt: null,
                hasApiKey: false,
                creditsAvailable: false,
              });

              // Clear rate limit cache so anonymous rate limiting can take over
              if (typeof window !== 'undefined') {
                setTimeout(() => {
                  const event = new CustomEvent('auth:signout');
                  window.dispatchEvent(event);
                }, 100);
              }
            }

            // Track sign in
            if (event === 'SIGNED_IN' && session?.user) {
              track('Sign In Success', {
                method: session.user.app_metadata.provider || 'valyu'
              });

              try {
                // Call API endpoint to transfer usage server-side
                const response = await fetch('/api/rate-limit?transfer=true', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                  }
                });

                if (response.ok) {
                  // Clear anonymous cookies after successful transfer
                  if (typeof window !== 'undefined') {
                    document.cookie = 'rl_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                  }
                }
              } catch (error) {
                // Ignore transfer errors
              }
            }
          }
        );

        // Clean up subscription on unmount
        if (typeof window !== 'undefined') {
          window.addEventListener('beforeunload', () => {
            subscription?.unsubscribe();
          });
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      // Persist user data and Valyu tokens
      partialize: (state) => ({
        user: state.user,
        valyuAccessToken: state.valyuAccessToken,
        valyuRefreshToken: state.valyuRefreshToken,
        valyuTokenExpiresAt: state.valyuTokenExpiresAt,
      }),
      skipHydration: true,
    }
  )
);
