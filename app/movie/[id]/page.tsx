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

type CommunityGapRow = {
  movie_id: number;
  avg_gap: number | null;
  ratings_count: number | null;
};

type CastMember = {
  id: number;
  name: string;
  character: string | null;
  profile_path: string | null;
  order: number;
};

type CreditsPayload = {
  cast: CastMember[];
  crew: { id: number; name: string; job: string | null; department: string | null }[];
};

export default function MoviePage() {
  const params = useParams();
  const id = String(params?.id ?? "");

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ratings (start leeg)
  const [preRating, setPreRating] = useState<number | null>(null);
  const [postRating, setPostRating] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // auth state
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Trailer + providers
  const [videos, setVideos] = useState<Video[]>([]);
  const [providers, setProviders] = useState<ProvidersPayload | null>(null);
  const [mediaLoading, setMediaLoading] = useState(true);

  // Community gap (voor iedereen)
  const [communityGap, setCommunityGap] = useState<CommunityGapRow | null>(null);
  const [communityLoading, setCommunityLoading] = useState(true);

  // Cast
  const [cast, setCast] = useState<CastMember[]>([]);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [showAllCast, setShowAllCast] = useState(false);

  const posterUrl = useMemo(() => {
    if (!movie?.poster_path) return null;
    return `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
  }, [movie]);

  const bestTrailer = useMemo(() => {
    if (!videos.length) return null;
    const officialTrailer = videos.find((v) => v.official && v.type === "Trailer");
    const anyTrailer = videos.find((v) => v.type === "Trailer");
    return officialTrailer || anyTrailer || videos[0];
  }, [videos]);

  // persoonlijke gap (alleen als user beide gezet heeft)
  const personalGap = useMemo(() => {
    if (preRating === null || postRating === null) return null;
    return postRating - preRating;
  }, [preRating, postRating]);

  const communityGapMeta = useMemo(() => {
    const g = communityGap?.avg_gap;
    if (g === null || g === undefined) return null;

    const rounded = Math.round(g * 10) / 10;

    if (rounded > 0) {
      return {
        label: `+${rounded} beter dan verwacht`,
        color: "#16a34a",
        bg: "rgba(22,163,74,0.12)",
        border: "rgba(22,163,74,0.35)",
      };
    }

    if (rounded < 0) {
      return {
        label: `${rounded} overhyped`,
        color: "#dc2626",
        bg: "rgba(220,38,38,0.10)",
        border: "rgba(220,38,38,0.35)",
      };
    }

    return {
      label: "0 exact zoals verwacht",
      color: "#a1a1aa",
      bg: "rgba(161,161,170,0.08)",
      border: "rgba(161,161,170,0.25)",
    };
  }, [communityGap]);

  function ProviderRow({ title, items }: { title: string; items: Provider[] }) {
    if (!items.length) return null;
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <div className="badge">{title}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {items.map((p) => (
            <div
              key={p.provider_id}
              className="badge"
              style={{ display: "flex", gap: 8, alignItems: "center" }}
            >
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

  /* ---------- auth check ---------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setIsLoggedIn(!!data.session?.user);
      setAuthChecked(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
      setAuthChecked(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

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
        } else setVideos([]);

        if (pRes.ok) {
          const pJson = (await pRes.json()) as ProvidersPayload;
          setProviders(pJson);
        } else setProviders(null);
      } finally {
        setMediaLoading(false);
      }
    })();
  }, [id]);

  /* ---------- Credits / cast ---------- */
  useEffect(() => {
    if (!id) return;

    (async () => {
      setCreditsLoading(true);
      try {
        const res = await fetch(`/api/tmdb/credits?id=${encodeURIComponent(id)}`);
        if (!res.ok) {
          setCast([]);
          return;
        }
        const json = (await res.json()) as CreditsPayload;
        const sorted = (json?.cast ?? []).slice().sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
        setCast(sorted);
      } finally {
        setCreditsLoading(false);
      }
    })();
  }, [id]);

  /* ---------- Community gap load (voor iedereen) ---------- */
  useEffect(() => {
    if (!movie) return;

    (async () => {
      setCommunityLoading(true);
      try {
        const { data, error } = await supabase
          .from("movie_expectation_gap")
          .select("movie_id, avg_gap, ratings_count")
          .eq("movie_id", movie.id)
          .maybeSingle();

        if (error) setCommunityGap(null);
        else setCommunityGap((data as CommunityGapRow) ?? null);
      } finally {
        setCommunityLoading(false);
      }
    })();
  }, [movie]);

  /* ---------- Load user ratings (alleen als ingelogd) ---------- */
  useEffect(() => {
    if (!movie) return;
    if (!authChecked) return;

    (async () => {
      if (!isLoggedIn) {
        setPreRating(null);
        setPostRating(null);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      const { data } = await supabase
        .from("ratings")
        .select("pre_rating, post_rating")
        .eq("user_id", user.id)
        .eq("movie_id", movie.id)
        .maybeSingle();

      if (data) {
        setPreRating(data.pre_rating ?? null);
        setPostRating(data.post_rating ?? null);
      }
    })();
  }, [movie, authChecked, isLoggedIn]);

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
    if (r?.did_release)
      return `✅ Opgeslagen! +10 punten vrijgegeven. (Avail: ${r.points_available}, Hold: ${r.points_on_hold})`;
    if (r?.did_pre_hold || r?.did_post_hold)
      return `✅ Opgeslagen! +5 punten on hold. (Avail: ${r.points_available}, Hold: ${r.points_on_hold})`;
    return "✅ Opgeslagen!";
  }

  /* ---------- Save rating ---------- */
  async function saveRatings(type: "pre" | "post") {
    if (!movie) return;

    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session?.user) {
      window.location.href = "/login";
      return;
    }

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
      if (type === "pre") {
        if (preRating === null) throw new Error("Kies eerst een pre-rating.");
        payload.pre_rating = preRating;
      }
      if (type === "post") {
        if (postRating === null) throw new Error("Kies eerst een post-rating.");
        payload.post_rating = postRating;
      }

      const { error: rErr } = await supabase.from("ratings").upsert(payload, {
        onConflict: "user_id,movie_id",
      });

      if (rErr) throw new Error(rErr.message);

      const msg = await applyPoints(movie.id);
      setSaveMsg(msg ?? "✅ Opgeslagen!");
    } catch (e: any) {
      setSaveMsg(`❌ ${e?.message ?? "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  const castToShow = useMemo(() => {
    if (showAllCast) return cast;
    return cast.slice(0, 12);
  }, [cast, showAllCast]);

  if (error) return <div className="card card-pad">{error}</div>;
  if (!movie) return <div className="card card-pad">Loading…</div>;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <a className="navlink" href="/">← Terug</a>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="btn btn-ghost" href="/surprising">🔥 Ranking</a>
          <a className="btn btn-ghost" href="/me">Mijn account</a>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 18 }}>
        {/* Left */}
        <div className="card">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={movie.title}
              style={{ width: "100%", display: "block", aspectRatio: "2/3", objectFit: "cover" }}
            />
          ) : (
            <div style={{ aspectRatio: "2/3", display: "grid", placeItems: "center", color: "#a1a1aa" }}>
              No poster
            </div>
          )}

          <div className="card-pad" style={{ display: "grid", gap: 10 }}>
            <div className="badge">TMDB #{movie.id}</div>

            {/* Community gap ALWAYS visible */}
            <div className="card" style={{ padding: 12, borderRadius: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <div className="badge">Community gap</div>
                <div style={{ fontSize: 12, color: "#a1a1aa" }}>{communityGap?.ratings_count ?? 0} ratings</div>
              </div>

              {communityLoading ? (
                <div style={{ marginTop: 10, color: "#a1a1aa", fontSize: 13 }}>Loading…</div>
              ) : communityGapMeta ? (
                <div
                  style={{
                    marginTop: 10,
                    borderRadius: 14,
                    padding: "10px 12px",
                    border: `1px solid ${communityGapMeta.border}`,
                    background: communityGapMeta.bg,
                    color: communityGapMeta.color,
                    fontWeight: 800,
                  }}
                >
                  Avg gap: {communityGapMeta.label}
                </div>
              ) : (
                <div style={{ marginTop: 10, color: "#a1a1aa", fontSize: 13 }}>
                  Nog geen data. Wees de eerste die pre + post rate.
                </div>
              )}
            </div>

            {/* Personal gap */}
            {personalGap !== null ? (
              <div
                style={{
                  borderRadius: 14,
                  padding: "10px 12px",
                  border: "1px solid rgba(99,102,241,0.35)",
                  background: "rgba(99,102,241,0.10)",
                  color: "#e4e4e7",
                  fontWeight: 800,
                }}
              >
                Jouw gap: {personalGap > 0 ? `+${personalGap}` : String(personalGap)}
              </div>
            ) : (
              <div style={{ color: "#a1a1aa", fontSize: 13 }}>
                {isLoggedIn ? "Geef pre + post om jouw persoonlijke gap te zien." : "Log in om zelf te raten en punten te verdienen."}
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
                    <div style={{ color: "#a1a1aa", fontSize: 13 }}>Geen providers gevonden voor BE.</div>
                  ) : null}
                </div>
              ) : (
                <div style={{ marginTop: 10, color: "#a1a1aa", fontSize: 13 }}>Geen provider info.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right */}
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
                <a className="navlink" href={`https://www.youtube.com/watch?v=${bestTrailer.key}`} target="_blank" rel="noreferrer">
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
                <div style={{ color: "#a1a1aa", fontSize: 13 }}>Geen YouTube trailer beschikbaar via TMDB.</div>
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

              <select
                className="select"
                value={preRating ?? ""}
                onChange={(e) => setPreRating(e.target.value ? Number(e.target.value) : null)}
                disabled={!isLoggedIn}
              >
                <option value="">Kies score</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}/10</option>
                ))}
              </select>

              <button
                className="btn btn-primary"
                disabled={!isLoggedIn || saving || preRating === null}
                onClick={() => saveRatings("pre")}
              >
                {!isLoggedIn ? "Login om te raten" : saving ? "Opslaan…" : "Opslaan"}
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
                disabled={!isLoggedIn}
              >
                <option value="">Kies score</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}/10</option>
                ))}
              </select>

              <button
                className="btn btn-primary"
                disabled={!isLoggedIn || saving || postRating === null}
                onClick={() => saveRatings("post")}
              >
                {!isLoggedIn ? "Login om te raten" : saving ? "Opslaan…" : "Opslaan"}
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
      {/* Cast */}
          <div className="card card-pad">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div className="badge">Cast</div>
                <h3 style={{ margin: "8px 0 0" }}>Acteurs</h3>
              </div>
              {cast.length > 12 ? (
                <button className="btn btn-ghost" onClick={() => setShowAllCast((v) => !v)}>
                  {showAllCast ? "Toon minder" : "Toon alles"}
                </button>
              ) : null}
            </div>

            {creditsLoading ? (
              <div style={{ marginTop: 10, color: "#a1a1aa", fontSize: 13 }}>Loading…</div>
            ) : cast.length ? (
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 12,
                }}
              >
                {castToShow.map((c) => (
                  <div key={c.id} className="card" style={{ padding: 12, borderRadius: 14 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      {c.profile_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${c.profile_path}`}
                          alt={c.name}
                          style={{ width: 44, height: 44, borderRadius: 12, objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: "rgba(39,39,42,0.9)",
                            display: "grid",
                            placeItems: "center",
                            color: "#a1a1aa",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {c.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: 12, color: "#a1a1aa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.character ?? "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 10, color: "#a1a1aa", fontSize: 13 }}>
                Geen cast info gevonden via TMDB.
              </div>
            )}
          </div>
    </div>
  );
}
