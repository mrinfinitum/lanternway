import { getCurrentChild, getToday } from "@/lib/data";
import { AppHeader } from "./_components/app-header";
import { BottomNav } from "./_components/bottom-nav";
import { LogProvider } from "./_components/log-store";
import { SideNav } from "./_components/side-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [child, today] = await Promise.all([getCurrentChild(), getToday()]);

  return (
    <LogProvider>
      <div className="flex min-h-dvh">
        <SideNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader child={child} today={today} />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 md:px-8 md:pb-12 print:p-0">
            {children}
          </main>
        </div>
      </div>
      <BottomNav />
    </LogProvider>
  );
}
