import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing TMDB_API_KEY" }, { status: 500 });
  }

  const url = `https://api.themoviedb.org/3/movie/${encodeURIComponent(
    id
  )}/videos?api_key=${apiKey}&language=en-US`;

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    return NextResponse.json({ error: `TMDB error ${res.status}` }, { status: res.status });
  }

  const data = await res.json();

  // Filter enkel bruikbare video’s (YouTube trailers/teasers)
  const videos = (data?.results ?? [])
    .filter((v: any) => v?.site === "YouTube" && v?.key)
    .map((v: any) => ({
      id: v.id,
      name: v.name,
      key: v.key,
      type: v.type,
      official: !!v.official,
      published_at: v.published_at,
    }));

  return NextResponse.json({ id, videos });
}
