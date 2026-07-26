"use client";

import { UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TripMember } from "@/features/trip/types";

type MemberSwitcherProps = {
  members: TripMember[];
  currentMemberId: string;
  onChange: (memberId: string) => void;
};

export function MemberSwitcher({
  members,
  currentMemberId,
  onChange
}: MemberSwitcherProps) {
  const currentMember = members.find((member) => member.id === currentMemberId);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <UsersRound className="h-4 w-4 text-teal" aria-hidden="true" />
        <span>当前成员</span>
      </div>
      <select
        className="focus-ring h-10 rounded-lg border border-input bg-white px-3 text-sm"
        value={currentMemberId}
        onChange={(event) => onChange(event.target.value)}
      >
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.displayName}
          </option>
        ))}
      </select>
      {currentMember ? (
        <Badge tone={currentMember.color}>
          {currentMember.role === "owner" ? "组织者" : "成员"}
        </Badge>
      ) : null}
    </div>
  );
}
