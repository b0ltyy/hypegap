"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type MovieDetail = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date?: string;
};

type Video = {
  id: string;
  name: string;
  key: string;
  type: string;
  official: boolean;
  published_at?: string;
};

type Provider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
};

type ProvidersPayload = {
  region: string;
  link: string | null;
  flatrate: Provider[];
  rent: Provider[];
  buy: Provider[];
};

export default function MoviePage() {
  const params = useParams();
  const id = String(params?.id ?? "");

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [preRating, setPreRating] = useState<number>(7);
  const [postRating, setPostRating] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);

  // Trailer + providers
  const [videos, setVideos] = useState<Video[]>([]);
  const [providers, setProviders] = useState<ProvidersPayload | null>(null);
  const [mediaLoading, setMediaLoading] = useState(true);

  const posterUrl = useMemo(() => {
    if (!movie?.poster_path) return null;
    return `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
  }, [movie]);

  const bestTrailer = useMemo(() => {
    if (!videos.length) return null;
    // voorkeur: officiële Trailer, anders eerste video
    const officialTrailer = videos.find((v) => v.official && v.type === "Trailer");
    const anyTrailer = videos.find((v) => v.type === "Trailer");
    return officialTrailer || anyTrailer || videos[0];
  }, [videos]);

  /* ---------- TMDB detail ---------- */
  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        setError(null);
        setMovie(null);

        const res = await fetch(`/api/tmdb/movie?id=${encodeURIComponent(id)}`);
        if (!res.ok) {
          setError(`TMDB error: ${res.status}`);
          return;
        }
        const data = (await res.json()) as MovieDetail;
        setMovie(data);
      } catch (e: any) {
        setError(e?.message ?? "Unknown error");
      }
    })();
  }, [id]);

  /* ---------- Trailer + providers ---------- */
  useEffect(() => {
    if (!id) return;

    (async () => {
      setMediaLoading(true);

      try {
        const [vRes, pRes] = await Promise.all([
          fetch(`/api/tmdb/videos?id=${encodeURIComponent(id)}`),
          fetch(`/api/tmdb/providers?id=${encodeURIComponent(id)}&region=BE`),
        ]);

        if (vRes.ok) {
          const vJson = await vRes.json();
          setVideos(vJson?.videos ?? []);
        } else {
          setVideos([]);
        }

        if (pRes.ok) {
          const pJson = (await pRes.json()) as ProvidersPayload;
          setProviders(pJson);
        } else {
          setProviders(null);
        }
      } finally {
        setMediaLoading(false);
      }
    })();
  }, [id]);

  /* ---------- Ratings load ---------- */
  useEffect(() => {
    if (!movie) return;

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setUserLoaded(true);
        return;
      }

      const { data } = await supabase
        .from("ratings")
        .select("pre_rating, post_rating")
        .eq("user_id", user.id)
        .eq("movie_id", movie.id)
        .maybeSingle();

      if (data) {
        if (data.pre_rating !== null) setPreRating(data.pre_rating);
        if (data.post_rating !== null) setPostRating(data.post_rating);
      }

      setUserLoaded(true);
    })();
  }, [movie]);

  /* ---------- Movie cache (FK safe) ---------- */
  async function ensureMovieCached(m: MovieDetail) {
    const releaseYear = m.release_date ? Number(m.release_date.slice(0, 4)) : null;

    const { error: movieErr } = await supabase.from("movies").upsert({
      id: m.id,
      title: m.title,
      poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
      description: m.overview,
      release_year: releaseYear,
    });

    if (movieErr) throw new Error(`Movie cache error: ${movieErr.message}`);
  }

  /* ---------- Points apply (server-side) ---------- */
  async function applyPoints(movieId: number) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return null;

    const res = await fetch("/api/points/apply", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ movieId }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Points apply failed");

    const r = json?.result;
    if (r?.did_release) return `✅ Opgeslagen! +10 punten vrijgegeven. (Avail: ${r.points_available}, Hold: ${r.points_on_hold})`;
    if (r?.did_pre_hold || r?.did_post_hold) return `✅ Opgeslagen! +5 punten on hold. (Avail: ${r.points_available}, Hold: ${r.points_on_hold})`;
    return "✅ Opgeslagen!";
  }

  /* ---------- Save rating ---------- */
  async function saveRatings(type: "pre" | "post") {
    if (!movie) return;

    setSaving(true);
    setSaveMsg(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      await ensureMovieCached(movie);

      const payload: any = { user_id: user.id, movie_id: movie.id };
      if (type === "pre") payload.pre_rating = preRating;
      if (type === "post") payload.post_rating = postRating;

      const { error: rErr } = await supabase
        .from("ratings")
        .upsert(payload, { onConflict: "user_id,movie_id" });

      if (rErr) throw new Error(rErr.message);

      const msg = await applyPoints(movie.id);
      setSaveMsg(msg ?? "✅ Opgeslagen!");
    } catch (e: any) {
      setSaveMsg(`❌ ${e?.message ?? "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  /* ---------- Gap ---------- */
  const gap = postRating !== null ? postRating - preRating : null;

  const gapMeta = useMemo(() => {
    if (gap === null) return null;
    if (gap > 0) return { label: `+${gap} overtrof verwachtingen`, color: "#16a34a", bg: "rgba(22,163,74,0.12)", border: "rgba(22,163,74,0.35)" };
    if (gap < 0) return { label: `${gap} viel tegen`, color: "#dc2626", bg: "rgba(220,38,38,0.10)", border: "rgba(220,38,38,0.35)" };
    return { label: "0 exact zoals verwacht", color: "#a1a1aa", bg: "rgba(161,161,170,0.08)", border: "rgba(161,161,170,0.25)" };
  }, [gap]);

  function ProviderRow({ title, items }: { title: string; items: Provider[] }) {
    if (!items.length) return null;
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <div className="badge">{title}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {items.map((p) => (
            <div key={p.provider_id} className="badge" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {p.logo_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${p.logo_path}`}
                  alt={p.provider_name}
                  style={{ width: 20, height: 20, borderRadius: 6 }}
                />
              ) : null}
              {p.provider_name}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) return <div className="card card-pad">{error}</div>;
  if (!movie || !userLoaded) return <div className="card card-pad">Loading…</div>;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <a className="navlink" href="/">← Terug</a>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="btn btn-ghost" href="/surprising">🔥 Ranking</a>
          <a className="btn btn-ghost" href="/me">Me</a>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 18 }}>
        {/* Left: poster + gap */}
        <div className="card">
          {posterUrl ? (
            <img src={posterUrl} alt={movie.title} style={{ width: "100%", display: "block", aspectRatio: "2/3", objectFit: "cover" }} />
          ) : (
            <div style={{ aspectRatio: "2/3", display: "grid", placeItems: "center", color: "#a1a1aa" }}>No poster</div>
          )}

          <div className="card-pad" style={{ display: "grid", gap: 10 }}>
            <div className="badge">TMDB #{movie.id}</div>

            {gapMeta ? (
              <div style={{ borderRadius: 14, padding: "10px 12px", border: `1px solid ${gapMeta.border}`, background: gapMeta.bg, color: gapMeta.color, fontWeight: 800 }}>
                Expectation Gap: {gapMeta.label}
              </div>
            ) : (
              <div style={{ color: "#a1a1aa", fontSize: 13 }}>
                Geef ook een <b>post-rating</b> om de gap te zien.
              </div>
            )}

            {/* Where to watch */}
            <div className="card" style={{ padding: 12, borderRadius: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <div className="badge">Where to watch (BE)</div>
                {providers?.link ? (
                  <a className="navlink" href={providers.link} target="_blank" rel="noreferrer">
                    Open TMDB →
                  </a>
                ) : null}
              </div>

              {mediaLoading ? (
                <div style={{ marginTop: 10, color: "#a1a1aa", fontSize: 13 }}>Loading…</div>
              ) : providers ? (
                <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
                  <ProviderRow title="Streaming" items={providers.flatrate} />
                  <ProviderRow title="Rent" items={providers.rent} />
                  <ProviderRow title="Buy" items={providers.buy} />
                  {!providers.flatrate.length && !providers.rent.length && !providers.buy.length ? (
                    <div style={{ color: "#a1a1aa", fontSize: 13 }}>
                      Geen providers gevonden voor BE.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div style={{ marginTop: 10, color: "#a1a1aa", fontSize: 13 }}>Geen provider info.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right: content + trailer + ratings */}
        <div style={{ display: "grid", gap: 14 }}>
          <div className="card card-pad">
            <h1 style={{ margin: 0, fontSize: 30, letterSpacing: -0.4 }}>{movie.title}</h1>
            <p style={{ margin: "6px 0 0", color: "#a1a1aa" }}>
              {movie.release_date ? `Release: ${movie.release_date}` : "Release: —"}
            </p>
            <p style={{ marginTop: 12, color: "#e4e4e7", lineHeight: 1.6 }}>
              {movie.overview || "Geen beschrijving."}
            </p>
          </div>

          {/* Trailer */}
          <div className="card card-pad">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
              <div>
                <div className="badge">Trailer</div>
                <h3 style={{ margin: "8px 0 0" }}>{bestTrailer ? bestTrailer.name : "Geen trailer gevonden"}</h3>
              </div>
              {bestTrailer ? (
                <a
                  className="navlink"
                  href={`https://www.youtube.com/watch?v=${bestTrailer.key}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open YouTube →
                </a>
              ) : null}
            </div>

            <div style={{ marginTop: 12 }}>
              {bestTrailer ? (
                <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(39,39,42,0.9)" }}>
                  <iframe
                    width="100%"
                    height="420"
                    src={`https://www.youtube.com/embed/${bestTrailer.key}`}
                    title="YouTube trailer"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div style={{ color: "#a1a1aa", fontSize: 13 }}>
                  Geen YouTube trailer beschikbaar via TMDB.
                </div>
              )}
            </div>
          </div>

          {/* Ratings */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="card card-pad" style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <div>
                  <div className="badge">Before watching</div>
                  <h3 style={{ margin: "8px 0 0" }}>Verwachting</h3>
                </div>
                <div style={{ fontSize: 12, color: "#a1a1aa" }}>pre</div>
              </div>

              <select className="select" value={preRating} onChange={(e) => setPreRating(Number(e.target.value))}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}/10</option>
                ))}
              </select>

              <button className="btn btn-primary" disabled={saving} onClick={() => saveRatings("pre")}>
                {saving ? "Opslaan…" : "Opslaan"}
              </button>
            </div>

            <div className="card card-pad" style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <div>
                  <div className="badge">After watching</div>
                  <h3 style={{ margin: "8px 0 0" }}>Ervaring</h3>
                </div>
                <div style={{ fontSize: 12, color: "#a1a1aa" }}>post</div>
              </div>

              <select
                className="select"
                value={postRating ?? ""}
                onChange={(e) => setPostRating(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Kies score</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}/10</option>
                ))}
              </select>

              <button className="btn btn-primary" disabled={postRating === null || saving} onClick={() => saveRatings("post")}>
                {saving ? "Opslaan…" : "Opslaan"}
              </button>
            </div>
          </div>

          {saveMsg && (
            <div
              className="card card-pad"
              style={{
                borderColor: saveMsg.startsWith("❌") ? "rgba(220,38,38,0.45)" : "rgba(99,102,241,0.35)",
                background: saveMsg.startsWith("❌") ? "rgba(220,38,38,0.08)" : "rgba(99,102,241,0.10)",
                color: "#e4e4e7",
              }}
            >
              {saveMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
