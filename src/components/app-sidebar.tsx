'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { createClient } from '@/utils/supabase/client-wrapper';
import {
  MessageCirclePlus,
  Settings,
  LogOut,
  Trash2,
  CreditCard,
  BarChart3,
  ChevronsUpDown,
  MoreHorizontal,
  Share,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SettingsModal } from '@/components/user/settings-modal';
import { useSubscription } from '@/hooks/use-subscription';

interface AppSidebarProps {
  currentSessionId?: string;
  onSessionSelect?: (sessionId: string) => void;
  onNewChat?: () => void;
  hasMessages?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export function AppSidebar({
  currentSessionId,
  onSessionSelect,
  onNewChat,
  hasMessages = false,
}: AppSidebarProps) {
  const { user } = useAuthStore();
  const signOut = useAuthStore((state) => state.signOut);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';

  const [showSettings, setShowSettings] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);

  // Fetch chat sessions
  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/chat/sessions', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      const { sessions } = await response.json();
      return sessions;
    },
    enabled: !!user
  });

  // Delete session mutation
  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      return sessionId;
    },
    onSuccess: (sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      if (currentSessionId === sessionId) {
        onNewChat?.();
      }
    }
  });

  const handleSessionSelect = useCallback((sessionId: string) => {
    onSessionSelect?.(sessionId);
  }, [onSessionSelect]);

  const handleNewChat = useCallback(() => {
    onNewChat?.();
  }, [onNewChat]);

  // Listen for upgrade modal trigger from rate limit banner
  useEffect(() => {
    const handleShowUpgradeModal = () => setShowSubscription(true);
    window.addEventListener('show-upgrade-modal', handleShowUpgradeModal);
    return () => window.removeEventListener('show-upgrade-modal', handleShowUpgradeModal);
  }, []);

  const handleLogoClick = () => {
    // If there's an active chat (either with session ID or just messages), warn before leaving
    if (currentSessionId || hasMessages) {
      const confirmed = window.confirm(
        user
          ? 'Leave this conversation? Your chat history will be saved.'
          : 'Start a new chat? Your current conversation will be lost.'
      );

      if (confirmed) {
        onNewChat?.();
      }
      return;
    }

    // If on other pages, navigate to home
    if (pathname !== '/') {
      router.push('/');
    }
  };

  const handleViewUsage = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/customer-portal', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (response.ok) {
        const { redirectUrl } = await response.json();
        window.open(redirectUrl, '_blank');
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const handleSignOut = () => {
    const confirmed = window.confirm('Are you sure you want to sign out?');
    if (confirmed) {
      signOut();
    }
  };

  // Get subscription status from database
  const subscription = useSubscription();
  const { isPaid } = subscription;

  return (
    <>
      <Sidebar collapsible="offcanvas">
        {/* Header with Logo */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                onClick={handleLogoClick}
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Image
                    src="/nabla.png"
                    alt="Bio"
                    width={28}
                    height={28}
                    className="rounded-lg"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Bio</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="overflow-hidden">
          {/* New Chat Action */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={user ? handleNewChat : () => window.dispatchEvent(new CustomEvent('show-auth-modal'))}
                  >
                    <MessageCirclePlus className="h-4 w-4" />
                    <span>New Chat</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Chat History - Hidden when logged in with no sessions */}
          {(!user || sessions.length > 0) && (
            <SidebarGroup className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
              <SidebarGroupLabel>Chat History</SidebarGroupLabel>
              <SidebarGroupContent>
                {!user ? (
                  <div className="px-2 py-4 text-center">
                    <p className="text-xs text-muted-foreground mb-2">
                      Sign in to save your chat history
                    </p>
                    <SidebarMenuButton
                      onClick={() => window.dispatchEvent(new CustomEvent('show-auth-modal'))}
                      className="w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Sign In
                    </SidebarMenuButton>
                  </div>
                ) : loadingSessions ? (
                  <SidebarMenu>
                    {[...Array(5)].map((_, i) => (
                      <SidebarMenuItem key={i}>
                        <SidebarMenuSkeleton showIcon />
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                ) : (
                <SidebarMenu>
                    {sessions.map((session: ChatSession) => (
                      <SidebarMenuItem key={session.id}>
                        <SidebarMenuButton
                          onClick={() => handleSessionSelect(session.id)}
                          isActive={currentSessionId === session.id}
                        >
                          <span>{session.title}</span>
                        </SidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuAction showOnHover>
                              <MoreHorizontal className="h-4 w-4" />
                            </SidebarMenuAction>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start">
                            <DropdownMenuItem>
                              <Share className="h-4 w-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => deleteMutation.mutate(session.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
              )}
            </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        {/* Footer with User Actions */}
        <SidebarFooter>
          <SidebarMenu>
            {/* Billing/Usage - Only for logged in users, hidden in development */}
            {user && !isDevelopment && (
              <SidebarMenuItem>
                {!isPaid ? (
                  <SidebarMenuButton onClick={() => setShowSubscription(true)}>
                    <CreditCard className="h-4 w-4" />
                    <span>Upgrade</span>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton onClick={handleViewUsage}>
                    <BarChart3 className="h-4 w-4" />
                    <span>Usage & Billing</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            )}

            <SidebarSeparator className="my-1" />

            {/* User Profile or Login */}
            {!user ? (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => window.dispatchEvent(new CustomEvent('show-auth-modal'))}
                  className="bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/30 dark:to-emerald-900/30 hover:from-blue-100 hover:to-emerald-100 dark:hover:from-blue-900/40 dark:hover:to-emerald-900/40"
                >
                  <LogOut className="h-4 w-4 text-blue-600 dark:text-blue-400 rotate-180" />
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Log in</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : (
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src={user.user_metadata?.avatar_url} />
                        <AvatarFallback className="rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 text-white dark:text-gray-900 text-xs font-semibold">
                          {user.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">Account</span>
                        <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                      </div>
                      <ChevronsUpDown className="ml-auto size-4" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                    side="right"
                    align="end"
                    sideOffset={4}
                  >
                    <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src={user.user_metadata?.avatar_url} />
                        <AvatarFallback className="rounded-lg">
                          {user.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{user.email}</span>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => setShowSettings(true)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600 dark:text-red-400">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/* Modals */}
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}
