type SupabaseAdminConfig = {
  url: string;
  serviceRoleKey: string;
};

export class SupabaseAdminError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "SupabaseAdminError";
    this.status = status;
  }
}

function getSupabaseAdminConfig(): SupabaseAdminConfig {
  const url = (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new SupabaseAdminError(
      "Supabase server credentials are not configured.",
      503
    );
  }

  return { url, serviceRoleKey };
}

function adminHeaders(prefer?: string) {
  const { serviceRoleKey } = getSupabaseAdminConfig();

  return {
    apikey: serviceRoleKey,
    ...(serviceRoleKey.startsWith("eyJ")
      ? { Authorization: `Bearer ${serviceRoleKey}` }
      : {}),
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {})
  };
}

export function encodeFilterValue(value: string) {
  return encodeURIComponent(value);
}

export async function supabaseAdminRequest<T>(
  table: string,
  query = "",
  init: RequestInit = {},
  prefer?: string
): Promise<T> {
  const { url } = getSupabaseAdminConfig();
  const response = await fetch(`${url}/rest/v1/${table}${query}`, {
    ...init,
    headers: {
      ...adminHeaders(prefer),
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text();

    throw new SupabaseAdminError(
      message || `Supabase admin request failed: ${response.status}`,
      response.status
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseText = await response.text();

  if (!responseText) {
    return undefined as T;
  }

  return JSON.parse(responseText) as T;
}
