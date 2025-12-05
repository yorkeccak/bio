'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FaGoogle } from 'react-icons/fa';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const authLoading = useAuthStore((state) => state.loading);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const [authData, setAuthData] = useState({
    email: '',
    password: '',
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await signIn(authData.email, authData.password);

      if (signInError) {
        if (signInError.message.includes('Email not confirmed')) {
          setError('Please check your inbox and confirm your email first.');
          setLoading(false);
          return;
        }

        if (signInError.message.includes('Invalid login credentials')) {
          const { data: signUpData, error: signUpError } = await signUp(
            authData.email,
            authData.password
          );

          if (
            signUpData?.user &&
            (!signUpData.user.identities || signUpData.user.identities.length === 0)
          ) {
            setError('Incorrect email or password.');
          } else if (signUpError) {
            setError('Incorrect email or password.');
          } else if (
            signUpData?.user &&
            signUpData.user.identities &&
            signUpData.user.identities.length > 0
          ) {
            setUserEmail(authData.email);
            setShowSuccess(true);
          } else {
            setError('Incorrect email or password.');
          }
        } else {
          setError(signInError.message);
        }
      }
      // Sign in successful - redirect will happen via auth state change
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
        setGoogleLoading(false);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setGoogleLoading(false);
    }
  };

  const isLoading = loading || authLoading;

  if (showSuccess) {
    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6 text-center py-8">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Check your inbox
                </h3>
                <p className="text-sm text-muted-foreground">
                  We sent a confirmation email to
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {userEmail}
                </p>
              </div>
              <Button
                onClick={() => {
                  setShowSuccess(false);
                  setAuthData({ email: '', password: '' });
                }}
                className="w-full"
              >
                Got it
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>
            Login with your Google account or email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isLoading || googleLoading}
            >
              {googleLoading ? (
                <>
                  <FaGoogle className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <FaGoogle className="mr-2 h-4 w-4" />
                  Login with Google
                </>
              )}
            </Button>

            <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
              <span className="relative z-10 bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>

            <form onSubmit={handleAuth}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={authData.email}
                    onChange={(e) =>
                      setAuthData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <a
                      href="#"
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={authData.password}
                    onChange={(e) =>
                      setAuthData((prev) => ({ ...prev, password: e.target.value }))
                    }
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Please wait...' : 'Login'}
                </Button>
              </div>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <span className="text-foreground">
                Just enter your email and password above
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      <p className="px-6 text-center text-xs text-muted-foreground">
        By clicking continue, you agree to our{' '}
        <a href="/terms" className="underline underline-offset-4 hover:text-primary">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
