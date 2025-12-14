import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const page = Number(searchParams.get("page") || "1");

  if (!q) {
    return NextResponse.json({ results: [], page: 1, total_pages: 0, total_results: 0 });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing TMDB_API_KEY" }, { status: 500 });
  }

  const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
    q
  )}&include_adult=false&language=en-US&page=${page}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: `TMDB error ${res.status}` }, { status: res.status });
  }

  const data = await res.json();

  const results = (data?.results ?? []).map((m: any) => ({
    id: m.id,
    title: m.title,
    overview: m.overview,
    poster_path: m.poster_path,
    release_date: m.release_date,
    vote_average: m.vote_average,
  }));

  return NextResponse.json({
    results,
    page: data.page ?? 1,
    total_pages: data.total_pages ?? 0,
    total_results: data.total_results ?? 0,
  });
}
