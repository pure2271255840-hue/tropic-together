"use client";

import { FormEvent } from "react";
import { UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type JoinNicknameModalProps = {
  open: boolean;
  accountDisplayName: string;
  displayName: string;
  error: string;
  isJoining: boolean;
  onChange: (displayName: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function JoinNicknameModal({
  open,
  accountDisplayName,
  displayName,
  error,
  isJoining,
  onChange,
  onClose,
  onSubmit
}: JoinNicknameModalProps) {
  return (
    <Modal
      open={open}
      title="确认加入行程"
      description="可以给这个行程单独设置昵称，不填会使用账号昵称。"
      onClose={onClose}
    >
      <form className="grid gap-3" onSubmit={onSubmit}>
        <input
          autoFocus
          className="field-control"
          autoComplete="nickname"
          maxLength={24}
          placeholder={`这个行程里的昵称，默认 ${accountDisplayName}`}
          value={displayName}
          onChange={(event) => onChange(event.target.value)}
        />
        {error ? (
          <p className="rounded-lg border border-coral/20 bg-secondary px-3 py-2 text-sm leading-6 text-coral">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isJoining}
            onClick={onClose}
          >
            取消
          </Button>
          <Button type="submit" disabled={isJoining} isLoading={isJoining}>
            {!isJoining ? (
              <UsersRound className="h-4 w-4" aria-hidden="true" />
            ) : null}
            {isJoining ? "加入中" : "确认加入"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
