import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const movieId = url.searchParams.get("movieId");

    if (!movieId) {
      return NextResponse.json({ error: "Missing movieId" }, { status: 400 });
    }

    const apiKey = process.env.TMDB_API_KEY!;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing TMDB_API_KEY" }, { status: 500 });
    }

    const r = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${apiKey}&language=en-US`,
      { cache: "no-store" }
    );

    const text = await r.text();
    if (!r.ok) {
      return NextResponse.json(
        { error: `TMDB credits error: ${r.status}`, details: text },
        { status: 500 }
      );
    }

    return NextResponse.json(JSON.parse(text));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
