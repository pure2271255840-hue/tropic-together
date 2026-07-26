export type AuthUser = {
  id: string;
  username: string;
  createdAt: string;
};

export type AuthResponse = {
  user: AuthUser | null;
};
