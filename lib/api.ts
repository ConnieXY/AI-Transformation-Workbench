"use client";

import { ensureAuthToken } from "@/lib/supabase/client";
import { isLocale, LOCALE_STORAGE_KEY } from "@/lib/i18n";

/**
 * 业务 API 调用统一入口：自动匿名登录并带上 Authorization: Bearer <jwt>，
 * 让服务端用「用户态」客户端走 RLS。未配置 Supabase / 未登录时不带 token，
 * 服务端据此降级（与公网静态/规则路径一致）。
 */
export async function apiFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await ensureAuthToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  headers.set("x-ui-language", isLocale(storedLocale) ? storedLocale : "zh");
  return fetch(input, { ...init, headers });
}
