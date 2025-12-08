'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { track } from '@vercel/analytics';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSignUpSuccess?: (message: string) => void;
}

export function AuthModal({ open, onClose, onSignUpSuccess }: AuthModalProps) {
  const signInWithValyu = useAuthStore((state) => state.signInWithValyu);
  const authLoading = useAuthStore((state) => state.loading);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track when auth modal is shown
  useEffect(() => {
    if (open) {
      track('Auth Modal Shown', {
        source: 'prompt_submit',
      });
    }
  }, [open]);

  const handleValyuSignIn = async () => {
    setLoading(true);
    setError(null);

    // Track sign in button click
    track('Valyu Sign In Clicked', {
      step: 'initiate',
    });

    try {
      const { error } = await signInWithValyu();
      if (error) {
        setError(error.message || 'Failed to initiate sign in');
        setLoading(false);
        // Track sign in error
        track('Valyu Sign In Error', {
          step: 'initiate',
          error: error.message || 'Failed to initiate sign in',
        });
      }
      // Don't close here as OAuth will redirect
      // Don't set loading false here as user will be redirected
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
      // Track unexpected error
      track('Valyu Sign In Error', {
        step: 'initiate',
        error: 'unexpected_error',
      });
    }
  };

  const isLoading = loading || authLoading;

  const handleClose = () => {
    // Track modal dismissed without signing in
    track('Auth Modal Dismissed', {
      had_error: !!error,
    });
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xs border-0 shadow-2xl bg-white dark:bg-gray-950 p-8">
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="text-xl font-normal text-gray-900 dark:text-gray-100">
            Bio.
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sign in with Valyu Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleValyuSignIn}
            disabled={isLoading}
            className="w-full p-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-3"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white dark:border-gray-900 border-t-transparent rounded-full"
                  />
                  <span className="text-sm font-medium">Connecting...</span>
                </motion.div>
              ) : (
                <motion.div
                  key="normal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-3"
                >
                  <span className="text-sm font-medium">Sign in with</span>
                  <Image
                    src="/valyu.svg"
                    alt="Valyu"
                    width={60}
                    height={20}
                    className="dark:invert"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Info text */}
          <div className="text-center space-y-1">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">$10 free credits</span> on signup
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Valyu is the search engine powering this app
            </p>
          </div>

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center text-sm text-red-500 dark:text-red-400"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </DialogContent>
    </Dialog>
  );
}
