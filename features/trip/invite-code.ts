export function normalizeInviteCode(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);

    return (segments[segments.length - 1] ?? "").trim().toUpperCase();
  } catch {
    const pathValue = trimmed.split(/[?#]/)[0];

    if (pathValue.includes("/")) {
      const segments = pathValue.split("/").filter(Boolean);

      return (segments[segments.length - 1] ?? "").trim().toUpperCase();
    }

    return trimmed.replace(/^#/, "").trim().toUpperCase();
  }
}

export function createInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function invitePath(inviteCode: string) {
  return `/join/${normalizeInviteCode(inviteCode)}`;
}
