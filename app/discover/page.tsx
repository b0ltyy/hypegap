"use client";

import { useState } from "react";
import Link from "next/link";

type Mode = "underrated" | "overrated";

type DiscoverMovie = {
  movie_id: number;
  title: string | null;
  poster_url: string | null;
  release_year: number | null;
  gap: number | null;
  pre_avg: number | null;
  post_avg: number | null;
  ratings_count: number | null;
};

export default function DiscoverPage() {
  const [mode, setMode] = useState<Mode>("underrated");
  const [top, setTop] = useState<number>(50);

  const [loading, setLoading] = useState(false);
  const [movie, setMovie] = useState<DiscoverMovie | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchOne() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/discover?mode=${mode}&top=${top}`, {
        cache: "no-store",
      });

      const text = await res.text();
      if (!res.ok) {
        setError(`${res.status} ${res.statusText}\n${text}`);
        setMovie(null);
        return;
      }

      const json = JSON.parse(text);
      setMovie(json.movie as DiscoverMovie);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      setMovie(null);
    } finally {
      setLoading(false);
    }
  }

  const modeLabel =
    mode === "underrated"
      ? "Underrated (positieve gap)"
      : "Overrated (negatieve gap)";

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 980, margin: "0 auto" }}>
      <div className="card card-pad">
        <div className="badge">Discover</div>
        <h1 style={{ margin: "10px 0 6px", fontSize: 26, letterSpacing: -0.3 }}>
          Geef mij een film
        </h1>
        <p style={{ margin: 0, color: "#a1a1aa" }}>
          Klik en krijg een film uit de top gaps.{" "}
          <b style={{ color: "#e4e4e7" }}>{modeLabel}</b>
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button
            className={`btn ${mode === "underrated" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setMode("underrated")}
            disabled={loading}
          >
            👍 Underrated
          </button>

          <button
            className={`btn ${mode === "overrated" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setMode("overrated")}
            disabled={loading}
          >
            👎 Overrated
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <span style={{ fontSize: 12, color: "#a1a1aa" }}>Random uit top</span>
            <select
              className="input"
              style={{ width: 120 }}
              value={top}
              onChange={(e) => setTop(Number(e.target.value))}
              disabled={loading}
            >
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
              <option value={200}>Top 200</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card card-pad" style={{ display: "grid", gap: 12 }}>
        <button className="btn btn-primary" onClick={fetchOne} disabled={loading}>
          {loading ? "Zoeken…" : "🎲 Geef mij een film"}
        </button>

        {error && (
          <div
            className="card"
            style={{
              padding: 12,
              borderColor: "rgba(220,38,38,0.45)",
              background: "rgba(220,38,38,0.08)",
              whiteSpace: "pre-wrap",
            }}
          >
            ❌ {error}
          </div>
        )}

        {!error && !movie && (
          <div className="card" style={{ padding: 12, color: "#a1a1aa" }}>
            Klik op <b style={{ color: "#e4e4e7" }}>“Geef mij een film”</b>.  
            Je krijgt een random film uit de hoogste gaps.
          </div>
        )}

        {movie && (
          <div
            className="card"
            style={{
              padding: 0,
              overflow: "hidden",
              display: "grid",
              gridTemplateColumns: "240px 1fr",
            }}
          >
            <div style={{ background: "rgba(24,24,27,0.9)" }}>
              {movie.poster_url ? (
                <img
                  src={movie.poster_url}
                  alt={movie.title ?? "Movie"}
                  style={{ width: "100%", display: "block", aspectRatio: "2/3", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    aspectRatio: "2/3",
                    display: "grid",
                    placeItems: "center",
                    color: "#a1a1aa",
                  }}
                >
                  No poster
                </div>
              )}
            </div>

            <div style={{ padding: 16, display: "grid", gap: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>
                  {movie.title ?? `Movie #${movie.movie_id}`}
                </h2>
                <div style={{ marginTop: 6, color: "#a1a1aa", fontSize: 13 }}>
                  {movie.release_year ?? "—"} • {movie.ratings_count ?? 0} ratings
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span className="badge">
                  Gap:{" "}
                  <b style={{ color: "#e4e4e7" }}>
                    {movie.gap === null ? "—" : movie.gap.toFixed(2)}
                  </b>
                </span>
                <span className="badge">
                  Pre avg:{" "}
                  <b style={{ color: "#e4e4e7" }}>
                    {movie.pre_avg === null ? "—" : movie.pre_avg.toFixed(2)}
                  </b>
                </span>
                <span className="badge">
                  Post avg:{" "}
                  <b style={{ color: "#e4e4e7" }}>
                    {movie.post_avg === null ? "—" : movie.post_avg.toFixed(2)}
                  </b>
                </span>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link className="btn btn-primary" href={`/movie/${movie.movie_id}`}>
                  Open film →
                </Link>
                <button className="btn btn-ghost" onClick={fetchOne} disabled={loading}>
                  Nog eentje 🎲
                </button>
              </div>

              <div style={{ fontSize: 12, color: "#71717a" }}>
                Tip: rate eerst <b style={{ color: "#e4e4e7" }}>pre</b>, kijk de film, en unlock punten met{" "}
                <b style={{ color: "#e4e4e7" }}>post</b>.
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Link className="navlink" href="/">
          ← Home
        </Link>
        <Link className="navlink" href="/surprising">
          Most Surprising →
        </Link>
      </div>
    </div>
  );
}
