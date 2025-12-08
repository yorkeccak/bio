'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);

  // useEffect(() => {
  //   if (!loading && user) {
  //     router.push('/');
  //   }
  // }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // if (user) {
  //   return null;
  // }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center font-medium">
          <span className="text-xl">Bio.</span>
        </Link>
        <LoginForm />
      </div>
    </div>
  );
}
