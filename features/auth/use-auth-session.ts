"use client";

import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import type { AuthResponse, AuthUser } from "./types";

type AuthPayload = AuthResponse & {
  message?: string;
};

type AuthSessionContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string;
  login: (username: string, password: string) => Promise<AuthUser | null>;
  register: (username: string, password: string) => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

async function parseAuthResponse(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as AuthPayload;

  if (!response.ok) {
    throw new Error(payload.message || "账号服务暂时不可用。");
  }

  return payload;
}

function useAuthSessionState(): AuthSessionContextValue {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const payload = await parseAuthResponse(
        await fetch("/api/auth/me", { cache: "no-store" })
      );

      setUser(payload.user);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "账号服务暂时不可用。");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAuthAction = useCallback(
    async (path: string, username: string, password: string) => {
      setIsSubmitting(true);
      setError("");

      try {
        const payload = await parseAuthResponse(
          await fetch(path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
          })
        );

        setUser(payload.user);
        return payload.user;
      } catch (nextError) {
        const message =
          nextError instanceof Error ? nextError.message : "账号服务暂时不可用。";

        setError(message);
        throw nextError;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const login = useCallback(
    (username: string, password: string) =>
      runAuthAction("/api/auth/login", username, password),
    [runAuthAction]
  );

  const register = useCallback(
    (username: string, password: string) =>
      runAuthAction("/api/auth/register", username, password),
    [runAuthAction]
  );

  const logout = useCallback(async () => {
    setIsSubmitting(true);
    setError("");

    try {
      await parseAuthResponse(
        await fetch("/api/auth/logout", { method: "POST" })
      );
      setUser(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "账号服务暂时不可用。");
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return useMemo(
    () => ({
      user,
      isLoading,
      isSubmitting,
      error,
      login,
      register,
      logout,
      refresh
    }),
    [error, isLoading, isSubmitting, login, logout, refresh, register, user]
  );
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const session = useAuthSessionState();

  return createElement(AuthSessionContext.Provider, { value: session }, children);
}

export function useAuthSession() {
  const session = useContext(AuthSessionContext);

  if (!session) {
    throw new Error("useAuthSession must be used within AuthSessionProvider.");
  }

  return session;
}
