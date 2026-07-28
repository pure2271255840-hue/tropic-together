"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Ticket } from "lucide-react";
import { AuthCard } from "@/components/trip/me/auth-card";
import { JoinNicknameModal } from "@/components/trip/me/join-nickname-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/use-auth-session";
import { setActiveTripMemberId } from "@/features/trip/active-member";
import { joinTripWithInvite } from "@/features/trip/join-trip";
import { normalizeInviteCode } from "@/features/trip/invite-code";

type JoinInvitePageProps = {
  inviteCode: string;
};

export function JoinInvitePage({ inviteCode }: JoinInvitePageProps) {
  const router = useRouter();
  const auth = useAuthSession();
  const normalizedInviteCode = useMemo(
    () => normalizeInviteCode(inviteCode),
    [inviteCode]
  );
  const [displayName, setDisplayName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinNicknameModal, setShowJoinNicknameModal] = useState(false);
  const accountDisplayName = auth.user?.displayName || auth.user?.username || "";

  function openJoinNicknameModal() {
    setDisplayName("");
    setJoinError("");
    setShowJoinNicknameModal(true);
  }

  async function submitJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!auth.user) {
      return;
    }

    setIsJoining(true);
    setJoinError("");

    try {
      const result = await joinTripWithInvite(normalizedInviteCode, displayName);

      setActiveTripMemberId(result.tripId, result.memberId);
      router.push(`/trip/${result.tripId}/itinerary?open=detail`);
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "暂时无法加入行程。");
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="corner-mark surface-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="page-kicker">邀请</p>
            <h1 className="page-title flex items-center gap-2">
              <Ticket className="h-5 w-5 text-teal" aria-hidden="true" />
              加入行程
            </h1>
          </div>
          <Badge tone="teal">{normalizedInviteCode}</Badge>
        </div>
      </section>

      {auth.isLoading && !auth.user ? (
        <section className="surface-card text-sm text-muted-foreground">
          正在读取账号
        </section>
      ) : auth.user ? (
        <section className="surface-card">
          <p className="text-sm leading-6 text-muted-foreground">
            当前账号：{accountDisplayName}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            登录账号：{auth.user.username}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={openJoinNicknameModal}
            >
              加入行程
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={auth.isSubmitting}
              isLoading={auth.isSubmitting}
              onClick={auth.logout}
            >
              {!auth.isSubmitting ? (
                <LogOut className="h-4 w-4" aria-hidden="true" />
              ) : null}
              切换账号
            </Button>
          </div>
          <JoinNicknameModal
            open={showJoinNicknameModal}
            accountDisplayName={accountDisplayName}
            displayName={displayName}
            error={joinError}
            isJoining={isJoining}
            onChange={setDisplayName}
            onClose={() => {
              if (!isJoining) {
                setShowJoinNicknameModal(false);
                setJoinError("");
              }
            }}
            onSubmit={submitJoin}
          />
        </section>
      ) : (
        <AuthCard
          error={auth.error}
          isSubmitting={auth.isSubmitting}
          onLogin={auth.login}
          onRegister={auth.register}
          onResetPassword={auth.resetPassword}
        />
      )}
    </main>
  );
}
