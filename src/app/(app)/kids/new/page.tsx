import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getToday } from "@/lib/data";
import { AddChildWizard } from "./add-child-wizard";

// Reads the signed-in session, so navigations wait for the server (see app layout).
export const instant = false;

export const metadata: Metadata = { title: "Add a child · Lanternway" };

export default async function AddChildPage() {
  const today = await getToday();
  return (
    <div>
      <PageHeader title="Add a child" description="A few quick questions to start their About Me. It takes about two minutes." />
      <AddChildWizard today={today} />
    </div>
  );
}
