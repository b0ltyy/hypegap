import { NextResponse } from "next/server";

type Mode = "underrated" | "overrated";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const mode = (url.searchParams.get("mode") as Mode) || "underrated";
    const top = Math.min(Math.max(Number(url.searchParams.get("top") ?? 50), 5), 200);

    // ✅ JOUW VIEW + KOLOMNAAM
    const viewName = "movie_expectation_gap";
    const orderCol = "avg_gap"; // <-- fix

    // underrated = hoogste avg_gap (desc)
    // overrated = laagste avg_gap (asc)
    const ascending = mode === "overrated";

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 500 });
    }

    // Pak top N en kies random eruit (zodat niet altijd dezelfde film)
    const endpoint =
      `${SUPABASE_URL}/rest/v1/${viewName}` +
      `?select=movie_id,title,poster_url,ratings_count,avg_gap` +
      `&order=${encodeURIComponent(orderCol)}.${ascending ? "asc" : "desc"}` +
      `&limit=${top}`;

    const r = await fetch(endpoint, {
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
      cache: "no-store",
    });

    const text = await r.text();
    if (!r.ok) {
      return NextResponse.json(
        {
          error: `Discover API error: ${r.status} ${r.statusText}`,
          details: text,
        },
        { status: 500 }
      );
    }

    const rows = JSON.parse(text) as any[];

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "No movies found" }, { status: 404 });
    }

    const pick = rows[Math.floor(Math.random() * rows.length)];

    const movie = {
      movie_id: pick.movie_id,
      title: pick.title ?? null,
      poster_url: pick.poster_url ?? null,
      ratings_count: pick.ratings_count ?? null,
      gap: pick.avg_gap ?? null, // frontend verwacht "gap" -> we mappen avg_gap naar gap
    };

    return NextResponse.json({ ok: true, mode, top, movie });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
