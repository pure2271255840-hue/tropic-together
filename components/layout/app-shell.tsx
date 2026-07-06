import type { ReactNode } from "react";
import { DesktopTripNav } from "./desktop-trip-nav";
import { MobileBottomNav } from "./mobile-bottom-nav";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl">
        <DesktopTripNav />
        <div className="min-w-0 flex-1">
          <main className="px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
            {children}
          </main>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
