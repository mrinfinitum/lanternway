import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { TestDataNotice } from "@/components/test-data-notice";
import { Button } from "@/components/ui/button";
import { getSignedInUser } from "@/lib/auth/server";
import { brandImages } from "@/lib/brand";
import { getChildren } from "@/lib/data";
import { SampleFamilyButton } from "./sample-family-button";

export const metadata: Metadata = { title: "Welcome · Lanternway" };

/** Where a new family lands before they've added a child. */
export default async function StartPage() {
  const [kids, user] = await Promise.all([getChildren(), getSignedInUser()]);
  if (kids.length > 0) redirect("/home");
  const { lumiPeeking } = brandImages;
  const name = user?.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-lg py-6 text-center">
      <Image {...lumiPeeking} alt="" className="mx-auto h-auto w-24" />
      <h1 className="mt-4 text-2xl font-extrabold md:text-3xl">Welcome{name ? `, ${name}` : ""}!</h1>
      <p className="mt-2 text-muted-foreground">
        Lanternway keeps your child&apos;s whole journey in one place. Start by telling us a little about them. It takes about
        two minutes, and you can change anything later.
      </p>
      <TestDataNotice compact className="mt-5" />
      <div className="mt-6 flex flex-col gap-3">
        <Button asChild size="lg" className="h-12 rounded-full text-base">
          <Link href="/kids/new">
            <Plus /> Add your first child
          </Link>
        </Button>
        <SampleFamilyButton />
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Private by design: your family&apos;s information is only visible to you. No ads, no trackers.
      </p>
    </div>
  );
}
