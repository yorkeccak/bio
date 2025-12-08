'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { validateCallback, exchangeCodeForTokens } from '@/lib/valyu-oauth';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          {/* Logo */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Bio.
            </h1>
          </div>

          {/* Status */}
          {step === 'error' ? (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Authentication Failed
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {error}
              </p>
              <button
                onClick={() => router.push('/')}
                className="mt-4 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md hover:opacity-90 transition-opacity"
              >
                Return to App
              </button>
            </div>
          ) : step === 'success' ? (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Signed In Successfully
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Redirecting you to the app...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                {step === 'validating' && 'Validating authentication...'}
                {step === 'exchanging' && 'Completing sign in...'}
                {step === 'creating_session' && 'Setting up your session...'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Please wait while we sign you in with Valyu.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Bio.
            </h1>
          </div>
          <div className="space-y-4">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Loading...
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ValyuAuthCompletePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ValyuAuthCompleteContent />
    </Suspense>
  );
}
