import { Suspense } from "react";
import { Eye } from "lucide-react";
import { AccessProvider } from "@/components/access";
import { getCurrentAccess } from "@/lib/data";
import { AppHeader } from "./_components/app-header";
import { BottomNav } from "./_components/bottom-nav";
import { LogProvider } from "./_components/log-store";
import { RecordsProvider } from "./_components/records-store";
import { SideNav } from "./_components/side-nav";

// Every app screen reads the signed-in session (a request-time check against Neon Auth),
// so navigations wait for the server instead of showing a prerendered shell. This is
// the documented opt-out for authenticated routes with Cache Components.
export const instant = false;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LogProvider>
      <RecordsProvider>
      <div className="flex min-h-dvh">
        <SideNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 md:px-8 md:pb-12 print:p-0">
            {/* Pages read the current-child cookie, so they stream in under this boundary. */}
            <Suspense fallback={<PageSkeleton />}>
              <WithAccess>{children}</WithAccess>
            </Suspense>
          </main>
        </div>
      </div>
      <BottomNav />
      </RecordsProvider>
    </LogProvider>
  );
}

/** Shares the person's role for the viewed child with the page, and says what they can do. */
async function WithAccess({ children }: { children: React.ReactNode }) {
  const { role, adminNames } = await getCurrentAccess();
  const who = adminNames.length ? adminNames.join(" or ") : "A family admin";
  return (
    <AccessProvider role={role}>
      {role !== "admin" && (
        <p className="mb-4 flex items-start gap-2 rounded-2xl bg-card px-4 py-3 text-sm ring-1 ring-border print:hidden">
          <Eye className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {role === "log" ? "You can see everything here and add daily logs and milestones." : "You can see everything here."} {who}{" "}
            can make other changes.
          </span>
        </p>
      )}
      {children}
    </AccessProvider>
  );
}

function PageSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-8 w-48 rounded-full bg-card" />
      <div className="h-40 rounded-2xl bg-card" />
      <div className="h-40 rounded-2xl bg-card" />
    </div>
  );
}
