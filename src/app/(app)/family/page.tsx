import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getSignedInUser } from "@/lib/auth/server";
import { getToday } from "@/lib/data";
import { TIME_ZONE_COOKIE, todayIn } from "@/lib/dates";
import { listMyFamilies } from "@/lib/sharing";
import { FamilySharing } from "./family-sharing";

// Reads the signed-in session, so navigations wait for the server (see app layout).
export const instant = false;

export const metadata: Metadata = { title: "Family sharing · Lanternway" };

export default async function FamilyPage() {
  const user = await getSignedInUser();
  if (!user) redirect("/sign-in");
  const [mine, today, store] = await Promise.all([listMyFamilies(user.id), getToday(), cookies()]);
  // Show when each invite expires as a date in the parent's own time zone.
  const tz = (store.get(TIME_ZONE_COOKIE)?.value ?? "").replace(/%2F/gi, "/");
  const families = mine.map((f) => ({ ...f, invites: f.invites.map((i) => ({ ...i, expiresAt: todayIn(tz, new Date(i.expiresAt)) })) }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Family sharing"
        description="Invite a co-parent, grandparent, or sitter. Each person gets their own sign-in, and you choose what they can do."
      />
      <FamilySharing families={families} today={today} />
    </div>
  );
}
