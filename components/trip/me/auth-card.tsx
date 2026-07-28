"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, KeyRound, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";

type AuthCardProps = {
  error: string;
  isSubmitting: boolean;
  onLogin: (username: string, password: string) => Promise<unknown>;
  onRegister: (
    username: string,
    password: string,
    displayName: string
  ) => Promise<unknown>;
  onResetPassword: (username: string, password: string) => Promise<unknown>;
};

export function AuthCard({
  error,
  isSubmitting,
  onLogin,
  onRegister,
  onResetPassword
}: AuthCardProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetUsername, setResetUsername] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const isRegistering = mode === "register";
  const isSubmitDisabled =
    !username.trim() ||
    !password ||
    (isRegistering && !displayName.trim()) ||
    isSubmitting;
  const isResetDisabled =
    !resetUsername.trim() || !resetPassword || isSubmitting;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitDisabled) {
      return;
    }

    try {
      if (mode === "login") {
        await onLogin(username, password);
      } else {
        await onRegister(username, password, displayName);
      }
    } catch {
      // The auth hook owns the visible error state.
    }
  }

  function openResetPasswordModal() {
    setResetUsername(username);
    setResetPassword("");
    setResetError("");
    setResetSuccess("");
    setShowResetPassword(false);
    setShowResetPasswordModal(true);
  }

  async function submitResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isResetDisabled) {
      return;
    }

    setResetError("");
    setResetSuccess("");

    try {
      await onResetPassword(resetUsername, resetPassword);
      setUsername(resetUsername);
      setPassword("");
      setResetPassword("");
      setResetSuccess("密码已重置，请使用新密码登录。");
    } catch (nextError) {
      setResetError(
        nextError instanceof Error ? nextError.message : "暂时无法重置密码。"
      );
    }
  }

  return (
    <section className="surface-card">
      <div className="grid grid-cols-2 gap-1 rounded-[1.125rem] border border-border bg-muted/55 p-1">
        <ModeButton
          active={mode === "login"}
          label="登录"
          onClick={() => setMode("login")}
        />
        <ModeButton
          active={mode === "register"}
          label="注册"
          onClick={() => setMode("register")}
        />
      </div>

      <form className="mt-4 grid gap-3" onSubmit={submit}>
        {isRegistering ? (
          <input
            className="field-control"
            id="auth-display-name"
            name="displayName"
            autoComplete="nickname"
            maxLength={24}
            placeholder="账号昵称"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        ) : null}
        <input
          className="field-control"
          id="auth-username"
          name="username"
          autoComplete="username"
          placeholder={isRegistering ? "登录账号" : "账号"}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <div className="relative">
          <input
            className="field-control w-full pr-12"
            id="auth-password"
            name="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            placeholder="密码"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            className="focus-ring absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary/60 hover:text-primary"
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {!isRegistering ? (
          <div className="flex justify-end">
            <button
              type="button"
              className="focus-ring rounded-md px-1 text-sm font-medium text-primary transition hover:bg-secondary"
              onClick={openResetPasswordModal}
            >
              忘记密码？
            </button>
          </div>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-coral/20 bg-secondary px-3 py-2 text-sm leading-6 text-coral">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={isSubmitDisabled}
          isLoading={isSubmitting}
        >
          {!isSubmitting && mode === "login" ? (
            <LogIn className="h-4 w-4" aria-hidden="true" />
          ) : null}
          {!isSubmitting && mode === "register" ? (
            <UserPlus className="h-4 w-4" aria-hidden="true" />
          ) : null}
          {isSubmitting
            ? mode === "login"
              ? "登录中"
              : "创建中"
            : mode === "login"
              ? "登录"
              : "创建账号"}
        </Button>
      </form>

      <Modal
        open={showResetPasswordModal}
        title="重置密码"
        description="临时流程：账号填写正确后，可以直接设置新密码。"
        onClose={() => {
          if (!isSubmitting) {
            setShowResetPasswordModal(false);
            setResetError("");
            setResetSuccess("");
          }
        }}
      >
        <form className="grid gap-3" onSubmit={submitResetPassword}>
          <input
            className="field-control"
            autoComplete="username"
            placeholder="账号"
            value={resetUsername}
            onChange={(event) => setResetUsername(event.target.value)}
          />
          <div className="relative">
            <input
              className="field-control w-full pr-12"
              autoComplete="new-password"
              placeholder="新密码，至少 6 位"
              type={showResetPassword ? "text" : "password"}
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
            />
            <button
              type="button"
              className="focus-ring absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary/60 hover:text-primary"
              aria-label={showResetPassword ? "隐藏密码" : "显示密码"}
              onClick={() => setShowResetPassword((current) => !current)}
            >
              {showResetPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {resetError ? (
            <p className="rounded-lg border border-coral/20 bg-secondary px-3 py-2 text-sm leading-6 text-coral">
              {resetError}
            </p>
          ) : null}
          {resetSuccess ? (
            <p className="rounded-lg border border-teal/20 bg-accent px-3 py-2 text-sm leading-6 text-teal">
              {resetSuccess}
            </p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setShowResetPasswordModal(false)}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isResetDisabled}
              isLoading={isSubmitting}
            >
              {!isSubmitting ? (
                <KeyRound className="h-4 w-4" aria-hidden="true" />
              ) : null}
              {isSubmitting ? "重置中" : "确认重置"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

function ModeButton({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "focus-ring h-10 rounded-lg px-3 text-sm font-medium transition",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-white hover:text-primary"
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
