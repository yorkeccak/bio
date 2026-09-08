'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { track } from '@vercel/analytics';
import { CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import BottomBar from '@/components/bottom-bar';
import DataSourceLogos from '@/components/data-source-logos';
import { AuthModal } from '@/components/auth/auth-modal';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { Sidebar } from '@/components/sidebar';
import { EnterpriseBanner } from '@/components/enterprise/enterprise-banner';
import { ResearchConsole } from '@/components/research/research-console';
import { WorkflowShowcase } from '@/components/research/workflow-showcase';
import { BioBackdrop } from '@/components/research/bio-backdrop';

/**
 * The landing surface: one question box wired to Valyu deep research, the
 * prebuilt life sciences workflow catalog underneath, and the data sources
 * behind both. Conversational chat moved to /chat.
 */
function HomeContent() {
  const { loading, valyuAccessToken } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isHoveringTitle, setIsHoveringTitle] = useState(false);
  const [autoTiltTriggered, setAutoTiltTriggered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAuthenticated =
    process.env.NEXT_PUBLIC_APP_MODE === 'self-hosted' || !!valyuAccessToken;

  // Listen for auth modal events (sidebar, rate-limit banners, …)
  useEffect(() => {
    const handleShowAuthModal = () => setShowAuthModal(true);
    window.addEventListener('show-auth-modal', handleShowAuthModal);
    return () => window.removeEventListener('show-auth-modal', handleShowAuthModal);
  }, []);

  // Links minted before chat moved still point at `/?chatId=…` / `/?q=…`.
  useEffect(() => {
    const chatId = searchParams.get('chatId');
    const q = searchParams.get('q');
    if (!chatId && !q) return;
    const params = new URLSearchParams();
    if (chatId) params.set('chatId', chatId);
    if (q) params.set('q', q);
    router.replace(`/chat?${params.toString()}`);
  }, [searchParams, router]);

  // Bounced off a signed-in-only route (e.g. /reports) by the layout gate
  useEffect(() => {
    if (searchParams.get('auth') !== 'required') return;
    setShowAuthModal(true);
    setNotification({ type: 'error', message: 'Sign in to view your reports.' });
    router.replace('/');
  }, [searchParams, router]);

  // Handle URL messages from auth callbacks
  useEffect(() => {
    const message = searchParams.get('message');
    const error = searchParams.get('error');

    if (message === 'email_updated') {
      setNotification({ type: 'success', message: 'Email address successfully updated!' });
      router.replace('/');
    } else if (message === 'email_link_expired') {
      setNotification({ type: 'error', message: 'Email confirmation link has expired. Please request a new email change.' });
      router.replace('/');
    } else if (error === 'auth_failed') {
      setNotification({ type: 'error', message: 'Authentication failed. Please try again.' });
      router.replace('/');
    }

    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router, notification]);

  // Detect mobile device for touch interactions
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth <= 768 ||
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTitleClick = useCallback(() => {
    if (!isMobile) return;
    track('Title Click', { trigger: 'mobile_touch' });
    setIsHoveringTitle(true);
    setTimeout(() => setIsHoveringTitle(false), 3000);
  }, [isMobile]);

  // Auto-trigger tilt animation after 2 seconds
  useEffect(() => {
    if (autoTiltTriggered) return;
    const timer = setTimeout(() => {
      track('Title Hover', { trigger: 'auto_tilt' });
      setIsHoveringTitle(true);
      setAutoTiltTriggered(true);
      setTimeout(() => setIsHoveringTitle(false), 2000);
    }, 2000);
    return () => clearTimeout(timer);
  }, [autoTiltTriggered]);

  const handleSignUpSuccess = useCallback((message: string) => {
    setNotification({ type: 'success', message });
  }, []);

  const handleLaunched = useCallback(
    (reportId: string) => router.push(`/reports?research=${reportId}`),
    [router],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5] dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F5F5F5] dark:bg-gray-950">
      <EnterpriseBanner />

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 z-50 -translate-x-1/2"
          >
            <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
              notification.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {notification.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {notification.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar
        onSessionSelect={(id: string) => router.push(`/chat?chatId=${id}`)}
        onNewChat={() => router.push('/chat')}
        hasMessages={false}
      />

      <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden">
        <BioBackdrop />

        <main className="relative z-10 flex flex-1 flex-col items-center px-4 pb-12 pt-10 text-center sm:px-8 sm:pt-14 lg:px-28">
          {/* Wordmark — hover (or tap) still reveals "By Valyu" */}
          <motion.div
            className="relative inline-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            onHoverStart={() => {
              if (isMobile) return;
              track('Title Hover', { trigger: 'user_hover' });
              setIsHoveringTitle(true);
            }}
            onHoverEnd={() => {
              if (!isMobile) setIsHoveringTitle(false);
            }}
            onClick={handleTitleClick}
          >
            <motion.h1
              className={`relative z-10 text-5xl font-light tracking-tight text-gray-900 dark:text-gray-100 sm:text-6xl ${
                isMobile ? 'cursor-pointer' : 'cursor-default'
              }`}
              style={{ transformOrigin: '15% 100%' }}
              animate={{ rotateZ: isHoveringTitle ? -8 : 0 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              Bio
            </motion.h1>

            <motion.div
              className="absolute -bottom-5 left-0 right-0 flex items-center justify-center gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHoveringTitle ? 1 : 0, y: isHoveringTitle ? 0 : -10 }}
              transition={{
                opacity: { delay: isHoveringTitle ? 0.15 : 0, duration: 0.2 },
                y: { delay: isHoveringTitle ? 0.1 : 0, duration: 0.3, ease: [0.23, 1, 0.32, 1] },
              }}
            >
              <span className="text-xs font-light text-gray-500 dark:text-gray-400">By</span>
              <Image src="/valyu.svg" alt="Valyu" width={60} height={60} className="h-4 opacity-80 dark:invert" />
            </motion.div>

            <div className="absolute inset-0 -bottom-10" />
          </motion.div>

          <motion.p
            className="mt-8 max-w-xl text-sm text-gray-500 dark:text-gray-400 sm:text-[15px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: 'easeOut' }}
          >
            Real-time biomedical research with deep, cited analysis
          </motion.p>

          <div className="mt-5 w-full">
            <ResearchConsole
              isAuthenticated={isAuthenticated}
              onLaunched={handleLaunched}
              onRequireAuth={() => setShowAuthModal(true)}
            />
          </div>

          <div className="mt-6 w-full">
            <WorkflowShowcase />
          </div>

          {/* Data sources shown as a light watermark strip, like the finance homepage. */}
          <motion.div
            className="mt-6 w-full max-w-5xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.5 }}
          >
            <DataSourceLogos />
          </motion.div>

          <motion.div
            className="mt-4 flex items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <span className="text-xs text-gray-400 dark:text-gray-500">Powered by</span>
            <Image
              src="/valyu.svg"
              alt="Valyu"
              width={60}
              height={60}
              className="h-4 opacity-40 dark:invert"
            />
          </motion.div>
        </main>

        <BottomBar />
      </div>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSignUpSuccess={handleSignUpSuccess}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5] dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
