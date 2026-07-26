"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { UsersRound } from "lucide-react";
import {
  testAccountTripChangeEvent,
  type TestAccountTripChangeDetail
} from "@/components/trip/phase1/test-account-shortcut-events";
import { useLocalTripStore } from "@/features/trip/use-local-trip-store";
import type { TripMember } from "@/features/trip/types";
import { cn } from "@/lib/utils";

function tripIdFromPath(pathname: string) {
  const [, firstSegment, tripId] = pathname.split("/");

  return firstSegment === "trip" && tripId
    ? tripId
    : "penang-kota-kinabalu-2026";
}

export function TestAccountShortcut() {
  const pathname = usePathname();
  const pathTripId = useMemo(() => tripIdFromPath(pathname), [pathname]);
  const [activeTripId, setActiveTripId] = useState(pathTripId);
  const { data, actions } = useLocalTripStore(activeTripId);
  const [switchedMember, setSwitchedMember] = useState<TripMember | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setActiveTripId(pathTripId);
  }, [pathTripId]);

  useEffect(() => {
    function handleActiveTripChange(event: Event) {
      const detail = (event as CustomEvent<TestAccountTripChangeDetail>).detail;

      if (detail?.tripId) {
        setActiveTripId(detail.tripId);
      }
    }

    window.addEventListener(testAccountTripChangeEvent, handleActiveTripChange);

    return () =>
      window.removeEventListener(
        testAccountTripChangeEvent,
        handleActiveTripChange
      );
  }, []);

  useEffect(() => {
    if (!switchedMember) {
      return;
    }

    setIsVisible(true);
    const timeoutId = window.setTimeout(() => setIsVisible(false), 1800);

    return () => window.clearTimeout(timeoutId);
  }, [switchedMember]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isTyping =
        activeTag === "input" || activeTag === "textarea" || activeTag === "select";

      if (
        isTyping ||
        !event.altKey ||
        !event.shiftKey ||
        event.key.toLowerCase() !== "m" ||
        data.members.length < 2
      ) {
        return;
      }

      event.preventDefault();

      const currentIndex = Math.max(
        data.members.findIndex((member) => member.id === data.currentMemberId),
        0
      );
      const nextMember = data.members[(currentIndex + 1) % data.members.length];

      actions.setCurrentMember(nextMember.id);
      setSwitchedMember(nextMember);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions, data.currentMemberId, data.members]);

  if (!switchedMember) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground shadow-soft transition",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      )}
      role="status"
      aria-live="polite"
    >
      <UsersRound className="h-4 w-4 text-teal" aria-hidden="true" />
      <span>测试账号：{switchedMember.displayName}</span>
      <span className="text-xs text-muted-foreground">Alt+Shift+M</span>
    </div>
  );
}
