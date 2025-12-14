"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Movie = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date?: string;
  vote_average?: number;
};

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [submittedQ, setSubmittedQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Movie[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canSearch = useMemo(() => submittedQ.trim().length >= 2, [submittedQ]);

  async function runSearch(query: string) {
    const clean = query.trim();
    if (clean.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(clean)}`, {
        cache: "no-store",
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        setResults([]);
        setError(
          json?.error
            ? `${json.error}${json.details ? `\n${json.details}` : ""}`
            : `Search API error: ${res.status} ${res.statusText}\n${text.slice(0, 300)}`
        );
        return;
      }

      setResults(json?.results ?? []);
    } catch (e: any) {
      setResults([]);
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // Typen = “soft” preview, Enter = submit (real search)
  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim().length >= 2) {
        setSubmittedQ(q);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!submittedQ) return;
    runSearch(submittedQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedQ]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card card-pad">
        <div className="badge">Search</div>
        <h1 style={{ margin: "10px 0 6px", fontSize: 26, letterSpacing: -0.3 }}>
          Zoek films
        </h1>
        <p style={{ margin: 0, color: "#a1a1aa" }}>
          Zoek in heel TMDB en open direct de film-pagina.
        </p>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btn-ghost" href="/">Trending</Link>
          <Link className="btn btn-ghost" href="/surprising">Surprising</Link>
          <Link className="btn btn-ghost" href="/leaderboard">Leaderboard</Link>
        </div>
      </div>

      <div className="card card-pad" style={{ display: "grid", gap: 10 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmittedQ(q);
            runSearch(q);
          }}
          style={{ display: "grid", gap: 10 }}
        >
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Typ een film… (Enter om te zoeken)"
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn btn-primary" type="submit" disabled={q.trim().length < 2 || loading}>
              {loading ? "Searching…" : "Zoeken"}
            </button>
            <div style={{ color: "#a1a1aa", fontSize: 12 }}>
              Min 2 letters. Tip: “Dune 2021”
            </div>
          </div>
        </form>
      </div>

      {error && (
        <div
          className="card card-pad"
          style={{
            borderColor: "rgba(220,38,38,0.45)",
            background: "rgba(220,38,38,0.08)",
            whiteSpace: "pre-wrap",
          }}
        >
          ❌ {error}
        </div>
      )}

      {!error && !loading && canSearch && (
        <div className="card card-pad" style={{ display: "grid", gap: 10 }}>
          {results.length === 0 ? (
            <div style={{ color: "#a1a1aa" }}>Geen resultaten.</div>
          ) : (
            results.slice(0, 30).map((m) => {
              const poster = m.poster_path ? `https://image.tmdb.org/t/p/w185${m.poster_path}` : null;
              const year = m.release_date ? m.release_date.slice(0, 4) : "—";
              const tmdb = typeof m.vote_average === "number" ? m.vote_average.toFixed(1) : "—";

              return (
                <Link key={m.id} href={`/movie/${m.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div
                    className="card"
                    style={{
                      padding: 12,
                      display: "grid",
                      gridTemplateColumns: "70px 1fr auto",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 70,
                        height: 100,
                        borderRadius: 14,
                        overflow: "hidden",
                        border: "1px solid rgba(39,39,42,0.9)",
                        background: "rgba(24,24,27,0.8)",
                      }}
                    >
                      {poster ? (
                        <img src={poster} alt={m.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : null}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {m.title}
                      </div>
                      <div style={{ fontSize: 12, color: "#a1a1aa", display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <span>{year}</span>
                        <span>TMDB: {tmdb}</span>
                        <span className="badge">Open →</span>
                      </div>
                      <div style={{ marginTop: 6, color: "#a1a1aa", fontSize: 13, lineHeight: 1.4 }}>
                        {(m.overview || "").slice(0, 160)}
                        {m.overview && m.overview.length > 160 ? "…" : ""}
                      </div>
                    </div>

                    <div style={{ color: "#71717a", fontSize: 12 }}>#{m.id}</div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
