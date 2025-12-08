'use client';

import { useTheme } from 'next-themes';
import { ThemeSwitcher } from './theme-switcher';
import { useAuthStore } from '@/lib/stores/use-auth-store';

export function ThemeSelector() {
  const { setTheme, theme } = useTheme();
  const valyuAccessToken = useAuthStore((state) => state.valyuAccessToken);
  const hasSubscription = !!valyuAccessToken;

  return (
    <ThemeSwitcher
      value={theme as 'light' | 'dark' | 'system'}
      onChange={(newTheme) => setTheme(newTheme)}
      defaultValue="light"
      requiresSubscription={true}
      hasSubscription={hasSubscription}
    />
  );
}

export function CompactThemeSelector({
  onUpgradeClick,
  sessionId
}: {
  onUpgradeClick?: () => void;
  sessionId?: string;
}) {
  const { setTheme, theme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const valyuAccessToken = useAuthStore((state) => state.valyuAccessToken);
  const hasSubscription = !!valyuAccessToken;

  return (
    <ThemeSwitcher
      value={theme as 'light' | 'dark' | 'system'}
      onChange={(newTheme) => setTheme(newTheme)}
      defaultValue="light"
      className="h-8 scale-75"
      requiresSubscription={true}
      hasSubscription={hasSubscription}
      onUpgradeClick={onUpgradeClick}
      userId={user?.id}
      sessionId={sessionId}
      tier={valyuAccessToken ? 'authenticated' : 'anonymous'}
    />
  );
}

export function ThemeMenuItem() {
  const { setTheme, theme } = useTheme();
  const valyuAccessToken = useAuthStore((state) => state.valyuAccessToken);
  const hasSubscription = !!valyuAccessToken;

  return (
    <ThemeSwitcher
      value={theme as 'light' | 'dark' | 'system'}
      onChange={(newTheme) => setTheme(newTheme)}
      defaultValue="light"
      requiresSubscription={true}
      hasSubscription={hasSubscription}
    />
  );
}