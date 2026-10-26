import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { getToday } from "@/lib/data";
import { ReportPicker } from "./report-picker";

// Reads the signed-in session, so navigations wait for the server (see app layout).
export const instant = false;

export const metadata: Metadata = { title: "Reports · Lanternway" };

export default async function ReportsPage() {
  const today = await getToday();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Reports"
        description="Bring a clear summary to appointments and meetings. Print it or save it as a PDF."
      />
      <Suspense fallback={<div className="h-96 rounded-2xl bg-card" />}>
        <ReportPicker today={today} />
      </Suspense>
    </div>
  );
}
