import { JoinInvitePage } from "@/components/trip/me/join-invite-page";

export const dynamic = "force-dynamic";

export default async function JoinInviteRoute({
  params
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;

  return <JoinInvitePage inviteCode={inviteCode} />;
}
