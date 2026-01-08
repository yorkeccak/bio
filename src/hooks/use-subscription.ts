'use client';

import { useAuthStore } from '@/lib/stores/use-auth-store';

export type SubscriptionTier = 'anonymous' | 'authenticated';

export interface UserSubscription {
  tier: SubscriptionTier;
  status: string;
  isAnonymous: boolean;
  isAuthenticated: boolean;
  hasValyuCredits: boolean;
  canDownloadReports: boolean;
  canAccessHistory: boolean;
}

/**
 * Simplified subscription hook for Valyu OAuth
 * With Valyu OAuth, users authenticate via Valyu Platform and use org credits
 * No local subscription tiers needed - all authenticated users have access
 */
export function useSubscription(): UserSubscription {
  const user = useAuthStore((state) => state.user);
  const valyuAccessToken = useAuthStore((state) => state.valyuAccessToken);
  const creditsAvailable = useAuthStore((state) => state.creditsAvailable);

  // Self-hosted mode bypass - grant all permissions
  const isSelfHosted = process.env.NEXT_PUBLIC_APP_MODE === 'self-hosted';

  if (isSelfHosted) {
    return {
      tier: 'authenticated',
      status: 'active',
      isAnonymous: false,
      isAuthenticated: true,
      hasValyuCredits: true,
      canDownloadReports: true,
      canAccessHistory: true,
    };
  }

  // Anonymous user
  if (!user && !valyuAccessToken) {
    return {
      tier: 'anonymous',
      status: 'inactive',
      isAnonymous: true,
      isAuthenticated: false,
      hasValyuCredits: false,
      canDownloadReports: false,
      canAccessHistory: false,
    };
  }

  // Authenticated user (via Valyu OAuth)
  return {
    tier: 'authenticated',
    status: 'active',
    isAnonymous: false,
    isAuthenticated: true,
    hasValyuCredits: creditsAvailable,
    canDownloadReports: true,
    canAccessHistory: true,
  };
}
