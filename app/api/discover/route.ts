import { NextResponse } from "next/server";

type Mode = "underrated" | "overrated";

/**
 * Verwacht dat je Supabase een view/table hebt die expectation gap bevat.
 * In jouw project bestaat er al iets als: public.movie_expectation_gap
 *
 * We proberen de meest voorkomende kolomnamen te gebruiken:
 * - movie_id (of id)
 * - title
 * - poster_url
 * - release_year
 * - gap (of expectation_gap)
 *
 * Als jouw view andere kolommen heeft, zeg het en ik pas dit exact aan.
 */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const mode = (url.searchParams.get("mode") as Mode) || "underrated";
    const top = Math.min(Math.max(Number(url.searchParams.get("top") ?? 50), 5), 200); // random uit top N
    const page = Math.max(Number(url.searchParams.get("page") ?? 0), 0);

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return NextResponse.json(
        { error: "Missing Supabase env vars" },
        { status: 500 }
      );
    }

    // Sort richting
    const ascending = mode === "overrated"; // overrated = negatieve gap eerst

    // We gebruiken PostgREST rechtstreeks (geen supabase-js nodig)
    // Let op: view naam hier:
    const viewName = "movie_expectation_gap";

    // Selecteer brede set; we picken later de juiste velden
    // order op mogelijke kolom: gap/expectation_gap
    // We proberen eerst gap, als dat faalt dan moet jij me zeggen hoe het heet.
    const orderCol = url.searchParams.get("orderCol") || "gap";

    const endpoint =
      `${SUPABASE_URL}/rest/v1/${viewName}` +
      `?select=*` +
      `&order=${encodeURIComponent(orderCol)}.${ascending ? "asc" : "desc"}` +
      `&limit=${top}` +
      `&offset=${page * top}`;

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
          hint:
            "Check of view 'movie_expectation_gap' bestaat en of kolom 'gap' (of 'expectation_gap') bestaat. Je kan orderCol meegeven: /api/discover?orderCol=expectation_gap",
        },
        { status: 500 }
      );
    }

    const rows = JSON.parse(text) as any[];

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "No movies found in expectation gap view" },
        { status: 404 }
      );
    }

    // Kies random uit de top N (zodat het niet altijd dezelfde film is)
    const pick = rows[Math.floor(Math.random() * rows.length)];

    // Normalize output (jij gebruikt movies.poster_url)
    const movie = {
      movie_id: pick.movie_id ?? pick.id ?? null,
      title: pick.title ?? null,
      poster_url: pick.poster_url ?? null,
      release_year: pick.release_year ?? null,
      gap: pick.gap ?? pick.expectation_gap ?? null,
      pre_avg: pick.pre_avg ?? null,
      post_avg: pick.post_avg ?? null,
      ratings_count: pick.ratings_count ?? null,
    };

    if (!movie.movie_id) {
      return NextResponse.json(
        {
          error: "View row missing movie_id/id",
          debugRow: pick,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, mode, top, movie });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
