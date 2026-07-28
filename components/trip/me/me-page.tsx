"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Pencil,
  Ticket,
  UserRound
} from "lucide-react";
import { AuthCard } from "@/components/trip/me/auth-card";
import { JoinNicknameModal } from "@/components/trip/me/join-nickname-modal";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
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
  const [showJoinNicknameModal, setShowJoinNicknameModal] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [showProfileNameModal, setShowProfileNameModal] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const accountDisplayName = auth.user?.displayName || auth.user?.username || "";

  useEffect(() => {
    if (auth.user) {
      setProfileDisplayName(auth.user.displayName || auth.user.username);
      setProfileError("");
      setShowProfileNameModal(false);
    }
  }, [auth.user]);

  async function submitProfileName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!auth.user) {
      return;
    }

    const nextDisplayName = profileDisplayName.trim();

    if (!nextDisplayName || nextDisplayName.length > 24) {
      setProfileError("账号昵称长度需要在 1-24 位之间。");
      return;
    }

    setIsSavingProfile(true);
    setProfileError("");

    try {
      const updatedUser = await auth.updateDisplayName(nextDisplayName);

      setProfileDisplayName(updatedUser?.displayName || nextDisplayName);
      setShowProfileNameModal(false);
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "暂时无法保存账号昵称。"
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  function openJoinNicknameModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!auth.user || !inviteCode.trim()) {
      return;
    }

    setDisplayName("");
    setJoinError("");
    setShowJoinNicknameModal(true);
  }

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
    <main className="page-shell">
      <section>
        <p className="page-kicker">账号</p>
        <h1 className="page-title">我的</h1>
      </section>

      {auth.isLoading && !auth.user ? (
        <section className="surface-card text-sm text-muted-foreground">
          正在读取账号
        </section>
      ) : auth.user ? (
        <>
          <section className="corner-mark surface-card">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
              <div className="min-w-0 space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  当前账号
                </p>
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-semibold">
                    <UserRound
                      className="h-5 w-5 text-teal"
                      aria-hidden="true"
                    />
                    {accountDisplayName}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    登录账号：{auth.user.username}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3 rounded-full"
                    onClick={() => {
                      setProfileDisplayName(accountDisplayName);
                      setProfileError("");
                      setShowProfileNameModal(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    修改昵称
                  </Button>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={auth.logout}
                disabled={auth.isSubmitting}
                isLoading={auth.isSubmitting}
              >
                {!auth.isSubmitting ? (
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                ) : null}
                {auth.isSubmitting ? "退出中" : "退出"}
              </Button>
            </div>
          </section>

          <section className="surface-card">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-teal" aria-hidden="true" />
              <h2 className="text-base font-semibold">加入行程</h2>
            </div>
            <form className="mt-4 grid gap-3" onSubmit={openJoinNicknameModal}>
              <input
                className="field-control uppercase"
                placeholder="邀请码"
                value={inviteCode}
                onChange={(event) =>
                  setInviteCode(normalizeInviteCode(event.target.value))
                }
              />
              <Button
                type="submit"
                disabled={!inviteCode.trim() || isJoining}
              >
                加入行程
              </Button>
            </form>
          </section>
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
          <Modal
            open={showProfileNameModal}
            title="修改昵称"
            description="这是账号昵称，不影响登录账号。"
            onClose={() => {
              if (!isSavingProfile) {
                setProfileDisplayName(accountDisplayName);
                setProfileError("");
                setShowProfileNameModal(false);
              }
            }}
          >
            <form className="grid gap-3" onSubmit={submitProfileName}>
              <input
                className="field-control"
                autoComplete="nickname"
                maxLength={24}
                placeholder="输入新的账号昵称"
                value={profileDisplayName}
                onChange={(event) => setProfileDisplayName(event.target.value)}
              />
              {profileError ? (
                <p className="rounded-lg border border-coral/20 bg-secondary px-3 py-2 text-sm leading-6 text-coral">
                  {profileError}
                </p>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSavingProfile}
                  onClick={() => {
                    setProfileDisplayName(accountDisplayName);
                    setProfileError("");
                    setShowProfileNameModal(false);
                  }}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingProfile || !profileDisplayName.trim()}
                  isLoading={isSavingProfile}
                >
                  保存昵称
                </Button>
              </div>
            </form>
          </Modal>
        </>
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
