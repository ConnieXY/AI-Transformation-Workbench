import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { featuredTraces } from "@/data/featured";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRACE_QUERY_TIMEOUT_MS = 1500;
const TRACE_CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

function traceResponse(payload: unknown) {
  return NextResponse.json(payload, {
    headers: { "Cache-Control": TRACE_CACHE_CONTROL },
  });
}

/** Trace 列表 + 聚合指标（Trace Viewer 数据源）。 */
export async function GET(req: Request) {
  const supabase = getSupabaseAdmin();
  // 公网无 DB → 展示固化的真实 trace 快照
  if (!supabase) return traceResponse(featuredTraces);

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "100"), 500);

  let data;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRACE_QUERY_TIMEOUT_MS);
  try {
    const result = await supabase
      .from("llm_traces")
      .select(
        "id, step, provider, model, operation, status, input_tokens, output_tokens, cost_usd, latency_ms, entity_type, entity_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit)
      .abortSignal(controller.signal);

    // Trace Viewer is a public portfolio surface. If the live telemetry store is
    // temporarily unreachable, keep the approved public snapshot available.
    if (result.error) return traceResponse(featuredTraces);
    data = result.data;
  } catch {
    return traceResponse(featuredTraces);
  } finally {
    clearTimeout(timeout);
  }

  const rows = data ?? [];
  const latencies = rows
    .map((r) => r.latency_ms)
    .filter((n): n is number => typeof n === "number")
    .sort((a, b) => a - b);
  const pct = (p: number) =>
    latencies.length
      ? latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))]
      : 0;

  const metrics = {
    total: rows.length,
    errors: rows.filter((r) => r.status === "error").length,
    totalCostUsd: Number(
      rows.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0).toFixed(6),
    ),
    totalTokens: rows.reduce(
      (s, r) => s + (r.input_tokens || 0) + (r.output_tokens || 0),
      0,
    ),
    p50: pct(50),
    p95: pct(95),
  };

  return traceResponse({ metrics, traces: rows });
}
