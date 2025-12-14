import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "TMDB_API_KEY missing" }, { status: 500 });
    }

    const tmdbRes = await fetch(
      `https://api.themoviedb.org/3/movie/${encodeURIComponent(id)}/credits?api_key=${apiKey}`,
      { cache: "no-store" }
    );

    if (!tmdbRes.ok) {
      const text = await tmdbRes.text();
      return NextResponse.json(
        { error: `TMDB credits error: ${tmdbRes.status}`, details: text },
        { status: tmdbRes.status }
      );
    }

    const json = await tmdbRes.json();

    // We sturen enkel wat we nodig hebben (veilig + klein)
    const cast = Array.isArray(json?.cast)
      ? json.cast.map((c: any) => ({
          id: c.id,
          name: c.name,
          character: c.character ?? null,
          profile_path: c.profile_path ?? null,
          order: c.order ?? 9999,
        }))
      : [];

    const crew = Array.isArray(json?.crew)
      ? json.crew.map((m: any) => ({
          id: m.id,
          name: m.name,
          job: m.job ?? null,
          department: m.department ?? null,
        }))
      : [];

    return NextResponse.json({ cast, crew });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Credits route crashed", details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
