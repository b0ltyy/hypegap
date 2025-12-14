import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!url || !anonKey || !serviceKey) {
      return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
    }

    // verify user token
    const verify = createClient(url, anonKey);
    const { data: userData, error: userErr } = await verify.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // admin query
    const admin = createClient(url, serviceKey);
    const { data, error } = await admin
      .from("profiles")
      .select("id, username, avatar_url, points_available, points_on_hold")
      .order("points_available", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []).map((r: any, idx: number) => ({
      rank: idx + 1,
      id: r.id,
      username: r.username || `User ${String(r.id).slice(0, 6)}`,
      avatar_url: r.avatar_url || null,
      points_available: r.points_available ?? 0,
      points_on_hold: r.points_on_hold ?? 0,
    }));

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
