'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { validateCallback, exchangeCodeForTokens } from '@/lib/valyu-oauth';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { track } from '@vercel/analytics';

type AuthStep = 'validating' | 'exchanging' | 'creating_session' | 'success' | 'error';

function ValyuAuthCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const completeValyuAuth = useAuthStore((state) => state.completeValyuAuth);

  const [step, setStep] = useState<AuthStep>('validating');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function completeAuth() {
      // Track OAuth callback received
      track('Valyu OAuth Callback', {
        step: 'received',
      });

      // Check for error in URL params
      const urlError = searchParams.get('error');
      if (urlError) {
        const errorDesc = searchParams.get('error_description') || urlError;
        setError(errorDesc);
        setStep('error');
        // Track OAuth error from Valyu
        track('Valyu Sign In Error', {
          step: 'oauth_callback',
          error: errorDesc,
        });
        return;
      }

      // Validate callback and extract code
      setStep('validating');
      const validationResult = validateCallback(searchParams);

      if ('error' in validationResult) {
        setError(validationResult.error);
        setStep('error');
        // Track validation error
        track('Valyu Sign In Error', {
          step: 'validation',
          error: validationResult.error,
        });
        return;
      }

      const { code, codeVerifier, redirectUri } = validationResult;

      // Exchange code for tokens
      setStep('exchanging');
      const tokenResult = await exchangeCodeForTokens(code, codeVerifier, redirectUri);

      if ('error' in tokenResult) {
        setError(tokenResult.error);
        setStep('error');
        // Track token exchange error
        track('Valyu Sign In Error', {
          step: 'token_exchange',
          error: tokenResult.error,
        });
        return;
      }

      const { tokens } = tokenResult;

      // Create local session via auth store
      setStep('creating_session');
      const sessionResult = await completeValyuAuth(
        tokens.idToken || '',
        tokens.accessToken,
        tokens.refreshToken,
        Math.floor((tokens.expiresAt - Date.now()) / 1000)
      );

      if (!sessionResult.success) {
        setError(sessionResult.error || 'Failed to create session');
        setStep('error');
        // Track session creation error
        track('Valyu Sign In Error', {
          step: 'session_creation',
          error: sessionResult.error || 'unknown',
        });
        return;
      }

      // Success! Track conversion
      setStep('success');
      track('Valyu Sign In Complete', {
        step: 'success',
        conversion: true,
      });

      setTimeout(() => {
        router.push('/');
      }, 1000);
    }

    completeAuth();
  }, [searchParams, completeValyuAuth, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        {step === 'error' ? (
          <>
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <h2 className="text-lg font-medium text-foreground">Authentication Failed</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
            >
              Return to App
            </button>
          </>
        ) : step === 'success' ? (
          <>
            <div className="w-12 h-12 bg-positive/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6 text-positive" />
            </div>
            <h2 className="text-lg font-medium text-foreground">Signed In Successfully</h2>
            <p className="text-sm text-muted-foreground">Redirecting you to the app...</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-lg font-medium text-foreground">
              {step === 'validating' && 'Validating authentication...'}
              {step === 'exchanging' && 'Completing sign in...'}
              {step === 'creating_session' && 'Setting up your session...'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Please wait while we sign you in with Valyu.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ValyuAuthCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ValyuAuthCompleteContent />
    </Suspense>
  );
}
