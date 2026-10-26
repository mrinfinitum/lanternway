import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { getCurrentChild, getLogs, getToday } from "@/lib/data";
import { LogForm } from "./log-form";

// Reads the signed-in session, so navigations wait for the server (see app layout).
export const instant = false;

export const metadata: Metadata = { title: "Log · Lanternway" };

export default async function LogPage() {
  const [child, today] = await Promise.all([getCurrentChild(), getToday()]);
  const todayLogs = await getLogs(child.id, { from: today, to: today });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Quick log" description="A few taps is plenty. Every entry helps the bigger picture." />
      {/* The form reads ?kind= from the URL, so it renders in the browser. */}
      <Suspense fallback={<div className="h-96 rounded-2xl bg-card" />}>
        <LogForm
          today={today}
          childId={child.id}
          childName={child.firstName}
          triggers={child.triggers}
          calmingStrategies={child.calmingStrategies}
          todayLogs={todayLogs}
        />
      </Suspense>
    </div>
  );
}
