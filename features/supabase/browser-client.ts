"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getSupabaseBrowserConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return url && key ? { url, key } : null;
}

export function isSupabaseBrowserConfigured() {
  return Boolean(getSupabaseBrowserConfig());
}

export function getSupabaseBrowserClient() {
  const config = getSupabaseBrowserConfig();

  if (!config) {
    return null;
  }

  if (!client) {
    client = createClient(config.url, config.key, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false
      }
    });
  }

  return client;
}
