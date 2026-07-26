"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Ticket,
  UserRound,
  UsersRound
} from "lucide-react";
import { AuthCard } from "@/components/trip/me/auth-card";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/use-auth-session";
import { setActiveTripMemberId } from "@/features/trip/active-member";
import { joinTripWithInvite } from "@/features/trip/join-trip";
import { normalizeInviteCode } from "@/features/trip/invite-code";

type MePageProps = {
  tripId: string;
};

export function MePage({ tripId }: MePageProps) {
  const router = useRouter();
  const auth = useAuthSession();
  const [inviteCode, setInviteCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  async function submitJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!auth.user || !inviteCode.trim()) {
      return;
    }

    setIsJoining(true);
    setJoinError("");

    try {
      const result = await joinTripWithInvite(inviteCode, displayName);

      setActiveTripMemberId(result.tripId, result.memberId);
      router.push(`/trip/${result.tripId}/itinerary`);
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "暂时无法加入行程。");
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4">
      <section>
        <p className="text-sm font-medium text-muted-foreground">账号</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal">我的</h1>
      </section>

      {auth.isLoading ? (
        <section className="rounded-lg border border-border bg-white p-4 text-sm text-muted-foreground shadow-soft">
          正在读取账号
        </section>
      ) : auth.user ? (
        <>
          <section className="rounded-lg border border-border bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">
                  当前账号
                </p>
                <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold">
                  <UserRound className="h-5 w-5 text-teal" aria-hidden="true" />
                  {auth.user.username}
                </h2>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={auth.logout}
                disabled={auth.isSubmitting}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                退出
              </Button>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-white p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-teal" aria-hidden="true" />
              <h2 className="text-base font-semibold">加入行程</h2>
            </div>
            <form className="mt-4 grid gap-3" onSubmit={submitJoin}>
              <input
                className="focus-ring h-11 rounded-lg border border-input bg-white px-3 text-sm uppercase"
                placeholder="邀请码"
                value={inviteCode}
                onChange={(event) =>
                  setInviteCode(normalizeInviteCode(event.target.value))
                }
              />
              <input
                className="focus-ring h-11 rounded-lg border border-input bg-white px-3 text-sm"
                placeholder="行程昵称，可选"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
              {joinError ? (
                <p className="rounded-lg border border-coral/25 bg-coral/10 px-3 py-2 text-sm leading-6 text-coral">
                  {joinError}
                </p>
              ) : null}
              <Button
                type="submit"
                disabled={!inviteCode.trim() || isJoining}
              >
                <UsersRound className="h-4 w-4" aria-hidden="true" />
                加入行程
              </Button>
            </form>
          </section>
        </>
      ) : (
        <AuthCard
          error={auth.error}
          isSubmitting={auth.isSubmitting}
          onLogin={auth.login}
          onRegister={auth.register}
        />
      )}
    </main>
  );
}
