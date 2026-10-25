import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { getToday } from "@/lib/data";
import { addDays } from "@/lib/dates";
import { isReportType } from "../report-types";
import { PrintButton } from "./print-button";
import { Report } from "./report";

export const metadata: Metadata = { title: "Report · Lanternway" };

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default function ReportViewPage({ searchParams }: PageProps<"/reports/view">) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/reports" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-teal">
          <ArrowLeft className="size-4" aria-hidden /> Choose a different report
        </Link>
        <PrintButton />
      </div>
      <Suspense fallback={<div className="h-[60vh] rounded-2xl bg-card" />}>
        <ReportFromParams searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ReportFromParams({ searchParams }: { searchParams: PageProps<"/reports/view">["searchParams"] }) {
  const params = await searchParams;
  const today = await getToday();
  const type = isReportType(params.type) ? params.type : "doctor";
  let to = isDate(params.to) && params.to <= today ? params.to : today;
  let from = isDate(params.from) ? params.from : addDays(to, -89);
  if (from > to) [from, to] = [to, from];
  return <Report type={type} from={from} to={to} today={today} />;
}
