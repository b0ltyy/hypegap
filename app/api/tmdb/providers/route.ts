import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const region = (searchParams.get("region") || "BE").toUpperCase();

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing TMDB_API_KEY" }, { status: 500 });
  }

  const url = `https://api.themoviedb.org/3/movie/${encodeURIComponent(
    id
  )}/watch/providers?api_key=${apiKey}`;

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    return NextResponse.json({ error: `TMDB error ${res.status}` }, { status: res.status });
  }

  const data = await res.json();

  // TMDB geeft per regio een object
  const country = data?.results?.[region] ?? null;

  // Normalize: link + providers lijst
  const normalizeList = (arr: any[]) =>
    (arr ?? []).map((p) => ({
      provider_id: p.provider_id,
      provider_name: p.provider_name,
      logo_path: p.logo_path,
    }));

  const payload = country
    ? {
        region,
        link: country.link ?? null,
        flatrate: normalizeList(country.flatrate),
        rent: normalizeList(country.rent),
        buy: normalizeList(country.buy),
      }
    : { region, link: null, flatrate: [], rent: [], buy: [] };

  return NextResponse.json(payload);
}
