"use client";

import { FormEvent, useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";

type AuthCardProps = {
  error: string;
  isSubmitting: boolean;
  onLogin: (username: string, password: string) => Promise<unknown>;
  onRegister: (username: string, password: string) => Promise<unknown>;
};

export function AuthCard({
  error,
  isSubmitting,
  onLogin,
  onRegister
}: AuthCardProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!username.trim() || !password) {
      return;
    }

    try {
      if (mode === "login") {
        await onLogin(username, password);
      } else {
        await onRegister(username, password);
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
        <input
          className="field-control"
          id="auth-username"
          name="username"
          autoComplete="username"
          placeholder="用户名"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <input
          className="field-control"
          id="auth-password"
          name="password"
          autoComplete={
            mode === "login" ? "current-password" : "new-password"
          }
          placeholder="密码"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? (
          <p className="rounded-lg border border-coral/20 bg-secondary px-3 py-2 text-sm leading-6 text-coral">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={!username.trim() || !password || isSubmitting}
        >
          {mode === "login" ? (
            <LogIn className="h-4 w-4" aria-hidden="true" />
          ) : (
            <UserPlus className="h-4 w-4" aria-hidden="true" />
          )}
          {mode === "login" ? "登录" : "创建账号"}
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
