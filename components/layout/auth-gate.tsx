"use client";

import type { ReactNode } from "react";
import { Plane } from "lucide-react";
import { AuthCard } from "@/components/trip/me/auth-card";
import { useAuthSession } from "@/features/auth/use-auth-session";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const auth = useAuthSession();

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="rounded-lg border border-border bg-white px-4 py-3 text-sm text-muted-foreground shadow-soft">
          正在读取账号
        </div>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-md space-y-4">
          <section className="rounded-lg border border-border bg-white p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Plane className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold">Tropic Together</p>
                <p className="text-xs text-muted-foreground">
                  登录后进入行程协作
                </p>
              </div>
            </div>
            <p className="mt-4 rounded-lg bg-muted/60 px-3 py-2 text-sm leading-6 text-muted-foreground">
              测试账号：noah / 123456
            </p>
          </section>
          <AuthCard
            error={auth.error}
            isSubmitting={auth.isSubmitting}
            onLogin={auth.login}
            onRegister={auth.register}
          />
        </div>
      </main>
    );
  }

  return children;
}
