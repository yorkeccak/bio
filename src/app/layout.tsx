import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MissingKeysDialog } from "@/components/missing-keys-dialog";
import { OllamaProvider } from "@/lib/ollama-context";
import { Analytics } from '@vercel/analytics/next';
import { AuthInitializer } from "@/components/auth/auth-initializer";
import { QueryProvider } from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider } from "@/components/posthog-provider";
import { logEnvironmentStatus } from "@/lib/env-validation";
import { ProviderSelector } from "@/components/providers/provider-selector";
import { MigrationBanner } from "@/components/migration-banner";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bio.valyu.ai";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Bio AI Agent - Biomedical Deep Research | Valyu",
    template: "%s | Bio AI Agent | Valyu",
  },
  description:
    "AI-powered biomedical research with access to PubMed, clinical trials, FDA drug labels, ChEMBL, DrugBank, and more. Deep research capabilities for drug discovery, medical literature analysis, and scientific research.",
  applicationName: "Bio AI Agent",
  keywords: [
    "biomedical research AI",
    "PubMed alternative",
    "clinical trial search",
    "FDA drug search",
    "medical literature AI",
    "drug discovery AI",
    "ChEMBL search",
    "DrugBank search",
    "bioRxiv search",
    "medRxiv search",
    "scientific literature search",
    "AI research assistant",
    "biomedical deep research",
    "medical AI agent",
  ],
  authors: [{ name: "Valyu", url: "https://valyu.ai" }],
  creator: "Valyu",
  publisher: "Valyu",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: baseUrl,
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Bio AI Agent - Biomedical Deep Research | Valyu",
    description:
      "AI-powered biomedical research with access to PubMed, clinical trials, FDA drug labels, ChEMBL, and DrugBank. Deep research capabilities for drug discovery and medical literature analysis.",
    url: baseUrl,
    siteName: "Bio AI Agent by Valyu",
    images: [
      {
        url: "/bio-screenshot.png",
        width: 1200,
        height: 630,
        alt: "Bio AI Agent - Biomedical Deep Research by Valyu",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bio AI Agent - Biomedical Deep Research | Valyu",
    description:
      "AI-powered biomedical research with access to PubMed, clinical trials, FDA drug labels, and more. Deep research for drug discovery and medical literature analysis.",
    images: ["/bio-screenshot.png"],
    creator: "@valyuai",
  },
  icons: {
    icon: [
      { url: "/nabla.png", sizes: "32x32", type: "image/png" },
      { url: "/nabla.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/nabla.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/nabla.png",
  },
  category: "Technology",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Bio AI Agent",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  description:
    "AI-powered biomedical research with access to PubMed, clinical trials, FDA drug labels, ChEMBL, DrugBank, and more. Deep research capabilities for drug discovery and medical literature analysis.",
  url: baseUrl,
  author: {
    "@type": "Organization",
    name: "Valyu",
    url: "https://valyu.ai",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "230",
  },
  featureList: [
    "PubMed literature search",
    "Clinical trials database access",
    "FDA drug label search",
    "ChEMBL compound search",
    "DrugBank integration",
    "bioRxiv and medRxiv preprints",
    "AI-powered research synthesis",
    "Interactive visualizations",
  ],
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthInitializer>
              <PostHogProvider>
                <OllamaProvider>
                  <MissingKeysDialog />
                  <MigrationBanner />
                  <ProviderSelector />
                  {children}
                  <Analytics />
                </OllamaProvider>
              </PostHogProvider>
            </AuthInitializer>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
