"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ReportView } from "@/components/research/report-view";

export default function ReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = use(params);
  const router = useRouter();

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-background">
      <Sidebar
        onSessionSelect={(id: string) => router.push(`/chat?chatId=${id}`)}
        onNewChat={() => router.push("/chat")}
        hasMessages={false}
      />
      <div className="flex min-w-0 flex-1 flex-col pt-14 md:pt-0">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
          <Link
            href="/reports"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> All reports
          </Link>
          <ReportView reportId={reportId} />
        </div>
      </div>
    </div>
  );
}
