'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Sends the user to the homepage on sign-out, wherever they were.
 *
 * Listens for the auth store's `auth:signout` event rather than hanging off the
 * sign-out button, so it also covers sign-outs this tab didn't initiate — an
 * expired session, a revoked Valyu token, or the user signing out in another
 * tab (Supabase broadcasts SIGNED_OUT across tabs).
 */
export function SignOutRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleSignOut = () => {
      // Chat sessions and reports are cached per user — drop them so the next
      // visitor on this browser never sees the previous one's data.
      queryClient.clear();
      if (pathname !== '/') router.replace('/');
    };

    window.addEventListener('auth:signout', handleSignOut);
    return () => window.removeEventListener('auth:signout', handleSignOut);
  }, [router, pathname, queryClient]);

  return null;
}
