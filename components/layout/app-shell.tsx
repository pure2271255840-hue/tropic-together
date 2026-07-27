import type { ReactNode } from "react";
import { AuthGate } from "./auth-gate";
import { DesktopTripNav } from "./desktop-trip-nav";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { TestAccountShortcut } from "@/components/trip/phase1/test-account-shortcut";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <AuthGate>
      <div className="eastern-corner min-h-screen bg-background">
        <div className="mx-auto flex w-full max-w-7xl">
          <DesktopTripNav />
          <div className="min-w-0 flex-1">
            <main className="px-5 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
              {children}
            </main>
          </div>
        </div>
        <MobileBottomNav />
        <TestAccountShortcut />
      </div>
    </AuthGate>
  );
}
