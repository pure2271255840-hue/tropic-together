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
        <TestAccountShortcut />
      </div>
    </AuthGate>
  );
}
