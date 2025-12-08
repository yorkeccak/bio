'use client';

import { useAuthStore } from '@/lib/stores/use-auth-store';
import { useSubscription } from '@/hooks/use-subscription';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, ExternalLink, Wallet } from 'lucide-react';

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ open, onClose }: SubscriptionModalProps) {
  const user = useAuthStore((state) => state.user);
  const subscription = useSubscription();

  // For authenticated users, show Valyu credits info
  if (subscription.isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="!max-w-md bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader className="space-y-3 pb-6">
            <DialogTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100 text-center">
              Your Account
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Status Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 dark:bg-blue-700 rounded-lg">
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      Valyu Credits
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Status: <span className="font-semibold text-green-600 dark:text-green-400">Active</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-gray-300">Unlimited queries</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-gray-300">Full tool access</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-gray-300">Download reports</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-gray-300">Uses your organization&apos;s Valyu credits</span>
                </div>
              </div>
            </div>

            {/* Manage Credits Button */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => window.open('https://platform.valyu.ai', '_blank')}
                className="w-full"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage Credits on Valyu
              </Button>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                View balance, add credits, and manage your organization
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // For anonymous users, show sign in prompt
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-md bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100 text-center">
            Sign In Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-center text-gray-600 dark:text-gray-400">
            Sign in with your Valyu account to access unlimited queries using your organization&apos;s credits.
          </p>

          <Button
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent('show-auth-modal'));
            }}
            className="w-full"
          >
            Sign in with Valyu
          </Button>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Don&apos;t have a Valyu account?{' '}
            <a
              href="https://platform.valyu.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Create one
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
