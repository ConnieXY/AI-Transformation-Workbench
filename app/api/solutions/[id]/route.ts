import { NextResponse } from "next/server";
import { getUserClient } from "@/lib/supabase/userClient";
import { FEATURED, featuredSolution } from "@/data/featured";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (params.id === FEATURED.solutionId) {
    return NextResponse.json(featuredSolution);
  }

  const supabase = getUserClient(req);
  if (!supabase) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("solutions")
    .select("id, input, result, citations, source, created_at")
    .eq("id", params.id)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: data.id,
    input: data.input,
    grounded: data.result,
    sources: data.citations ?? [],
    source: data.source,
    createdAt: data.created_at,
  });
}
