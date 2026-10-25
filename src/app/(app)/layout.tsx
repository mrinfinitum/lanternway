import { Suspense } from "react";
import { AppHeader } from "./_components/app-header";
import { BottomNav } from "./_components/bottom-nav";
import { LogProvider } from "./_components/log-store";
import { RecordsProvider } from "./_components/records-store";
import { SideNav } from "./_components/side-nav";

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
            <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
          </main>
        </div>
      </div>
      <BottomNav />
      </RecordsProvider>
    </LogProvider>
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
