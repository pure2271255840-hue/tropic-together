export type AuthUser = {
  id: string;
  username: string;
  displayName?: string;
  createdAt: string;
};

export type AuthResponse = {
  user: AuthUser | null;
};
