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

  if (auth.isLoading && !auth.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="rounded-[1.25rem] border border-border bg-white px-5 py-4 text-sm text-muted-foreground shadow-soft">
          正在读取账号
        </div>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <main className="eastern-corner flex min-h-screen items-center justify-center bg-background px-5 py-8">
        <div className="w-full max-w-md space-y-5">
          <section className="corner-mark rounded-[1.25rem] border border-border bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[1.125rem] bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(242,99,76,0.22)]">
                <Plane className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold">Tropic Together</p>
                <p className="text-xs text-muted-foreground">
                  登录后进入行程协作
                </p>
              </div>
            </div>
          </section>
          <AuthCard
            error={auth.error}
            isSubmitting={auth.isSubmitting}
            onLogin={auth.login}
            onRegister={auth.register}
            onResetPassword={auth.resetPassword}
          />
        </div>
      </main>
    );
  }

  return children;
}
