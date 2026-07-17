import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 健康检查 / Supabase 保活。
 *
 * 由 Vercel Cron 每天打一次（见 vercel.json）：免费版 Supabase 连续 7 天
 * 无外部请求会自动暂停项目，而库内 pg_cron 不算活跃，必须从外部打真实查询。
 *
 * 鉴权：配了 CRON_SECRET 时强制校验 Bearer（Vercel Cron 会自动带上该头），
 * 避免这个会打 DB 的端点被公网随意刷。未配则只做无副作用的只读探活。
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  // 未配 Supabase（公网降级形态）→ 没有要保活的库，返回 ok 即可
  if (!supabase) {
    return NextResponse.json({ ok: true, supabase: "unconfigured" });
  }

  const startedAt = Date.now();
  const { error } = await supabase.from("companies").select("id").limit(1);
  const latencyMs = Date.now() - startedAt;

  if (error) {
    return NextResponse.json(
      { ok: false, supabase: "error", error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    supabase: "awake",
    latencyMs,
    checkedAt: new Date().toISOString(),
  });
}
