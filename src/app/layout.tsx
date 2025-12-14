import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MissingKeysDialog } from "@/components/missing-keys-dialog";
import { Analytics } from '@vercel/analytics/next';
import { AuthInitializer } from "@/components/auth/auth-initializer";
import { QueryProvider } from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider } from "@/components/posthog-provider";
import { logEnvironmentStatus } from "@/lib/env-validation";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  title: {
    default: "Bio | By Valyu",
    template: "%s | Bio | By Valyu",
  },
  description:
    "Enterprise-grade biomedical research AI with access to PubMed, clinical trials, FDA drug labels, secure Python execution, and interactive visualizations for comprehensive research.",
  applicationName: "Bio | By Valyu",
  openGraph: {
    title: "Bio | By Valyu",
    description:
      "Access PubMed articles, clinical trials, FDA drug labels, and more. AI-powered biomedical research with secure Python execution and interactive visualizations.",
    url: "/",
    siteName: "Bio | By Valyu",
    images: [
      {
        url: "/valyu.png",
        width: 1200,
        height: 630,
        alt: "Bio | By Valyu",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bio | By Valyu",
    description:
      "AI-powered biomedical research. Access PubMed, clinical trials, FDA drug labels. Secure Python execution in E2B sandboxes with persistent sessions for statistical analysis and visualizations.",
    images: ["/valyu.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Log environment status on server-side render
  if (typeof window === 'undefined') {
    logEnvironmentStatus();
  }
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthInitializer>
              <PostHogProvider>
                <MissingKeysDialog />
                {children}
                <Analytics />
              </PostHogProvider>
            </AuthInitializer>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}