"use client";

import { ResearchChat } from "@/components/research/research-chat";
import { useState, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BottomBar from "@/components/bottom-bar";
import Image from "next/image";
import { track } from "@vercel/analytics";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthModal } from "@/components/auth/auth-modal";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { Sidebar } from "@/components/sidebar";
import { EnterpriseBanner } from "@/components/enterprise/enterprise-banner";

function HomeContent() {
  const { loading } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isHoveringTitle, setIsHoveringTitle] = useState(false);
  const [autoTiltTriggered, setAutoTiltTriggered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // An active DeepResearch run (?research=<id>) takes over the main area; hide
  // the hero while it's showing.
  const researchActive = !!searchParams.get("research");

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Listen for auth modal events (sidebar, rate-limit banners, …)
  useEffect(() => {
    const handleShowAuthModal = () => setShowAuthModal(true);
    window.addEventListener("show-auth-modal", handleShowAuthModal);
    return () =>
      window.removeEventListener("show-auth-modal", handleShowAuthModal);
  }, []);

  // Bounced off a signed-in-only route (e.g. /reports) by the layout gate
  useEffect(() => {
    if (searchParams.get("auth") !== "required") return;
    setShowAuthModal(true);
    setNotification({ type: "error", message: "Sign in to view your reports." });
    router.replace("/");
  }, [searchParams, router]);

  // Handle URL messages from auth callbacks
  useEffect(() => {
    const message = searchParams.get("message");
    const error = searchParams.get("error");

    if (message === "email_updated") {
      setNotification({
        type: "success",
        message: "Email address successfully updated!",
      });
      router.replace("/");
    } else if (message === "email_link_expired") {
      setNotification({
        type: "error",
        message:
          "Email confirmation link has expired. Please request a new email change.",
      });
      router.replace("/");
    } else if (error === "auth_failed") {
      setNotification({
        type: "error",
        message: "Authentication failed. Please try again.",
      });
      router.replace("/");
    }

    // Auto-hide notifications after 5 seconds
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
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent,
          ),
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle title click on mobile
  const handleTitleClick = useCallback(() => {
    if (!isMobile) return;
    track("Title Click", { trigger: "mobile_touch" });
    setIsHoveringTitle(true);
    // Keep it tilted for 3 seconds then close
    setTimeout(() => setIsHoveringTitle(false), 3000);
  }, [isMobile]);

  // Auto-trigger tilt animation after 2 seconds
  useEffect(() => {
    if (researchActive || autoTiltTriggered) return;
    const timer = setTimeout(() => {
      track("Title Hover", { trigger: "auto_tilt" });
      setIsHoveringTitle(true);
      setAutoTiltTriggered(true);
      // Keep it tilted for 2 seconds then close
      setTimeout(() => setIsHoveringTitle(false), 2000);
    }, 2000);
    return () => clearTimeout(timer);
  }, [researchActive, autoTiltTriggered]);

  const handleNewChat = useCallback(() => {
    // Clear any active DeepResearch run so Home lands on the input.
    const url = new URL(window.location.href);
    url.searchParams.delete("research");
    window.history.replaceState(null, "", url.toString());
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Subtle research-campus backdrop, anchored to the bottom of the viewport. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-[58vh] select-none"
      >
        <Image
          src="/workflows/skyline-bg.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-bottom opacity-[0.12] dark:opacity-[0.10] dark:invert dark:hue-rotate-180"
        />
        {/* Fade the top edge into the page so there is no hard seam. */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-background" />
      </div>

      {/* Enterprise Banner */}
      <EnterpriseBanner />

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
                notification.type === "success"
                  ? "bg-positive/10 text-positive border border-positive/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              {notification.type === "success" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {notification.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <Sidebar
        onSessionSelect={(id: string) => router.push(`/?research=${id}`)}
        onNewChat={handleNewChat}
        hasMessages={false}
      />

      {/* Main Content Area */}
      <div
        className={`main-content-shell relative z-10 flex-1 min-w-0 flex flex-col pt-14 md:pt-0 ${
          !researchActive ? "md:justify-center" : ""
        }`}
      >
        {/* Header - Animate out when a research run is active */}
        <AnimatePresence mode="wait">
          {!researchActive && (
            <motion.div
              className="text-center pt-8 md:pt-2 pb-3 md:pb-5 px-4 md:px-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <motion.div
                className="relative mb-8 inline-block"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
                onHoverStart={() => {
                  if (!isMobile) {
                    track("Title Hover", { trigger: "user_hover" });
                    setIsHoveringTitle(true);
                  }
                }}
                onHoverEnd={() => {
                  if (!isMobile) setIsHoveringTitle(false);
                }}
                onClick={handleTitleClick}
              >
                <motion.h1
                  className={`text-3xl sm:text-5xl font-light text-foreground tracking-tight relative z-10 ${
                    isMobile ? "cursor-pointer" : "cursor-default"
                  }`}
                  style={{ transformOrigin: "15% 100%" }}
                  animate={{ rotateZ: isHoveringTitle ? -8 : 0 }}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                >
                  Bio
                </motion.h1>

                {/* "By Valyu" that slides out from under */}
                <motion.div
                  className="absolute -bottom-5 left-0 right-0 flex items-center justify-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: isHoveringTitle ? 1 : 0,
                    y: isHoveringTitle ? 0 : -10,
                  }}
                  transition={{
                    opacity: { delay: isHoveringTitle ? 0.15 : 0, duration: 0.2 },
                    y: {
                      delay: isHoveringTitle ? 0.1 : 0,
                      duration: 0.3,
                      ease: [0.23, 1, 0.32, 1],
                    },
                  }}
                >
                  <span className="text-sm text-muted-foreground font-light">By</span>
                  <Image
                    src="/valyu.svg"
                    alt="Valyu"
                    width={60}
                    height={60}
                    className="h-4 opacity-80 dark:invert"
                  />
                </motion.div>

                {/* Mobile tap hint */}
                {isMobile && !isHoveringTitle && (
                  <motion.div
                    className="absolute -bottom-8 left-0 right-0 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 3, duration: 0.5 }}
                  >
                    <span className="text-xs text-muted-foreground">Tap to reveal</span>
                  </motion.div>
                )}

                {/* Hover area extender */}
                <div className="absolute inset-0 -bottom-10" />
              </motion.div>
              <motion.p
                className="text-muted-foreground text-xs sm:text-sm max-w-xs sm:max-w-md mx-auto px-4 sm:px-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
              >
                Real-time biomedical research with deep, cited analysis
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DeepResearch runner */}
        <motion.div
          className={`px-0 md:px-4 overflow-x-hidden ${
            !researchActive ? "pb-4 md:pb-6" : "flex-1 pb-16"
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
            <ResearchChat />
          </Suspense>
        </motion.div>

        <BottomBar />
      </div>

      {/* Auth Modal */}
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
