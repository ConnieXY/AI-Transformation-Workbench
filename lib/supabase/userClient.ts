import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * 按请求构造「用户态」Supabase 客户端（anon key + 请求里的用户 JWT）。
 * DB 层 RLS 按 owner = auth.uid() 强制隔离 —— 修复 IDOR：用户只能读写自己的数据。
 *
 * 返回 null 的两种情况，调用方都按「无持久化」降级（与未配置 DB 时同路径，安全）：
 *  - 未配置 Supabase（公网部署，无 anon key）；
 *  - 请求未带 Bearer（未匿名登录 / 后台未开启匿名登录）。
 */
export function getUserClient(req: Request): SupabaseClient | null {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;

  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
