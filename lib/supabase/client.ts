"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

let client: SupabaseClient | null = null;

/** 浏览器端 Supabase 客户端（anon key）。未配置则返回 null（公网降级）。 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (!url || !anon) return null;
  if (!client) client = createClient(url, anon);
  return client;
}

let pending: Promise<string | null> | null = null;

/**
 * 确保已匿名登录并返回 access token（用于带到 API 做 RLS 鉴权）。
 * 未配置 Supabase / 未开启匿名登录时返回 null —— 调用方据此降级。
 */
export async function ensureAuthToken(): Promise<string | null> {
  const sb = getBrowserSupabase();
  if (!sb) return null;

  const existing = (await sb.auth.getSession()).data.session;
  if (existing?.access_token) return existing.access_token;

  if (!pending) {
    pending = (async () => {
      const { error } = await sb.auth.signInAnonymously();
      if (error) {
        console.warn("[auth] 匿名登录失败（请在 Supabase 后台开启 Anonymous sign-ins）：", error.message);
        return null;
      }
      return (await sb.auth.getSession()).data.session?.access_token ?? null;
    })().finally(() => {
      pending = null;
    });
  }
  return pending;
}
