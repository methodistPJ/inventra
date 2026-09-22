"use client";
import { createClient } from "@supabase/supabase-js";
// Optional public client for future public content. Student data and scores use /api only.
// There are intentionally no anon/authenticated table grants in the initial migration.
export function publicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error("Public Supabase environment is not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}
