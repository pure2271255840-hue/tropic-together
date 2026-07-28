"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
};

export function AuthCard({
  error,
  isSubmitting,
  onLogin,
  onRegister
}: AuthCardProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isRegistering = mode === "register";
  const isSubmitDisabled =
    !username.trim() ||
    !password ||
    (isRegistering && !displayName.trim()) ||
    isSubmitting;

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
