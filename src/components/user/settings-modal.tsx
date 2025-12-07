'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { createClient } from '@/utils/supabase/client-wrapper';
import { useRateLimit } from '@/lib/hooks/use-rate-limit';
import { useSubscription } from '@/hooks/use-subscription';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Mail, User, BarChart3, CreditCard } from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type TabType = 'account' | 'usage' | 'billing';

const navItems = [
  { name: 'Account', icon: User, tab: 'account' as TabType },
  { name: 'Usage', icon: BarChart3, tab: 'usage' as TabType },
  { name: 'Billing', icon: CreditCard, tab: 'billing' as TabType },
];

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const rateLimit = useRateLimit();
  const subscription = useSubscription();

  if (!user) return null;

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail.trim() || newEmail === user.email) {
      setMessage({ type: 'error', text: 'Please enter a different email address' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail.trim()
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({
          type: 'success',
          text: 'Email update initiated. Please check both your current and new email addresses for confirmation links.'
        });
        setNewEmail('');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update email'
      });
    } finally {
      setLoading(false);
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'account': return 'Account';
      case 'usage': return 'Usage';
      case 'billing': return 'Billing';
    }
  };

  const getTierDisplayName = () => {
    switch (subscription.tier) {
      case 'unlimited': return 'Pro Unlimited';
      case 'pay_per_use': return 'Pay-As-You-Go';
      case 'free': return 'Free';
      default: return 'Free';
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <div className="space-y-6">
            {/* Current User Info */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {user.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{user.email?.split('@')[0]}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>

            {/* Email Update Form */}
            <form onSubmit={handleEmailUpdate} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Change Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {message && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {message.type === 'success' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {message.text}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !newEmail.trim()}
                className="w-full"
              >
                {loading ? 'Updating...' : 'Update Email'}
              </Button>
            </form>

            <div className="text-xs text-gray-500 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <strong>Note:</strong> You&apos;ll receive confirmation emails at both your current and new email addresses.
              You must confirm the change from both addresses for security.
            </div>
          </div>
        );

      case 'usage':
        const usagePercent = rateLimit.limit ? Math.min((rateLimit.used || 0) / rateLimit.limit * 100, 100) : 0;
        const resetTimeStr = rateLimit.resetTime
          ? new Date(rateLimit.resetTime).toLocaleString()
          : 'N/A';

        return (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Tier</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {rateLimit.tier === 'unlimited' ? 'Pro Unlimited' :
                   rateLimit.tier === 'pay_per_use' ? 'Pay-As-You-Go' :
                   rateLimit.tier === 'free' ? 'Free' :
                   rateLimit.tier || 'Free'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Credits Used</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {rateLimit.used || 0} / {rateLimit.limit === Infinity ? 'Unlimited' : rateLimit.limit || 0}
                  </span>
                </div>
                {rateLimit.limit !== Infinity && (
                  <Progress value={usagePercent} className="h-2" />
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Credits Remaining</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {rateLimit.remaining === Infinity ? 'Unlimited' : rateLimit.remaining || 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Resets At</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {resetTimeStr}
                </span>
              </div>
            </div>

            {!subscription.isPaid && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                Upgrade to a paid plan for more credits and unlimited access.
              </div>
            )}
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Plan</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {getTierDisplayName()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
                <span className={`text-sm font-semibold ${
                  subscription.isPaid ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {subscription.isPaid ? 'Active' : 'Free Tier'}
                </span>
              </div>
            </div>

          </div>
        );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="overflow-hidden p-0 max-h-[580px] md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
          <DialogTitle className="sr-only">Settings</DialogTitle>
          <DialogDescription className="sr-only">
            Manage your account settings, usage, and billing.
          </DialogDescription>
          <SidebarProvider className="items-start">
            <Sidebar collapsible="none" className="hidden md:flex">
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {navItems.map((item) => (
                        <SidebarMenuItem key={item.name}>
                          <SidebarMenuButton
                            asChild
                            isActive={activeTab === item.tab}
                          >
                            <button onClick={() => setActiveTab(item.tab)}>
                              <item.icon />
                              <span>{item.name}</span>
                            </button>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as TabType)}
              className="flex h-[480px] flex-1 flex-col overflow-hidden"
            >
              {/* Mobile tabs - only visible on mobile */}
              <TabsList className="mx-2 mt-4 mb-2 w-full h-11 md:hidden">
                {navItems.map((item) => (
                  <TabsTrigger key={item.tab} value={item.tab} className="flex-1">
                    <item.icon className="h-4 w-4 mr-1.5" />
                    {item.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <h2 className="text-lg font-semibold">{getTabTitle()}</h2>
              </header>
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                {renderContent()}
              </div>
            </Tabs>
          </SidebarProvider>
        </DialogContent>
      </Dialog>
    </>
  );
}
