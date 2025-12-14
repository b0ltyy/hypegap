"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Row = {
  movie_id: number;
  title: string;
  poster_url: string | null;
  ratings_count: number;
  avg_gap: number;
};

export default function SurprisingPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // UI filters
  const [mode, setMode] = useState<"best" | "worst">("best");
  const [minRatings, setMinRatings] = useState<number>(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("movie_expectation_gap")
        .select("*")
        .order("avg_gap", { ascending: mode === "worst" })
        .limit(200);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setRows((data as Row[]) || []);
      setLoading(false);
    })();
  }, [mode]);

  const filtered = useMemo(() => {
    return rows
      .filter((r) => (r.ratings_count ?? 0) >= minRatings)
      .slice(0, 30);
  }, [rows, minRatings]);

  function gapPill(gap: number) {
    if (gap > 0) return { text: `+${gap.toFixed(2)}`, color: "#16a34a", bg: "rgba(22,163,74,0.12)", border: "rgba(22,163,74,0.35)" };
    if (gap < 0) return { text: `${gap.toFixed(2)}`, color: "#dc2626", bg: "rgba(220,38,38,0.10)", border: "rgba(220,38,38,0.35)" };
    return { text: "0.00", color: "#a1a1aa", bg: "rgba(161,161,170,0.08)", border: "rgba(161,161,170,0.25)" };
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header */}
      <div
        className="card"
        style={{
          padding: 18,
          background:
            "radial-gradient(900px 450px at 10% 10%, rgba(99,102,241,0.20), transparent 55%), radial-gradient(900px 450px at 90% 40%, rgba(217,70,239,0.15), transparent 60%), rgba(9,9,11,0.6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ minWidth: 260 }}>
            <div className="badge">Ranking</div>
            <h1 style={{ margin: "10px 0 6px", fontSize: 28, letterSpacing: -0.4 }}>
              {mode === "best" ? "🔥 Most Surprising" : "💀 Most Disappointing"}
            </h1>
            <p style={{ margin: 0, color: "#a1a1aa", maxWidth: 720 }}>
              Dit is de kern van HypeGap: <b style={{ color: "#e4e4e7" }}>avg(post − pre)</b> over alle gebruikers.
            </p>
          </div>

          {/* Controls */}
          <div style={{ width: 360, maxWidth: "100%", display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className={`btn ${mode === "best" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setMode("best")}
              >
                Best
              </button>
              <button
                className={`btn ${mode === "worst" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setMode("worst")}
              >
                Worst
              </button>
            </div>

            <div className="card" style={{ padding: 12, borderRadius: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#a1a1aa" }}>
                <span>Minimum ratings</span>
                <span style={{ color: "#e4e4e7", fontWeight: 700 }}>{minRatings}</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={minRatings}
                onChange={(e) => setMinRatings(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <div style={{ fontSize: 12, color: "#71717a" }}>
                Zet hoger om “ruis” te vermijden.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className="btn btn-ghost" href="/">
                ← Trending
              </Link>
              <Link className="btn btn-ghost" href="/me">
                Me
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading && <div className="card card-pad">Loading…</div>}

      {error && (
        <div className="card card-pad" style={{ borderColor: "rgba(220,38,38,0.45)", background: "rgba(220,38,38,0.08)" }}>
          ❌ {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="card card-pad">
          Nog geen data. Rate films met zowel <b>pre</b> als <b>post</b>.
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
            gap: 14,
          }}
        >
          {filtered.map((m) => {
            const pill = gapPill(m.avg_gap ?? 0);

            return (
              <Link
                key={m.movie_id}
                href={`/movie/${m.movie_id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="card" style={{ transition: "150ms" }}>
                  {m.poster_url ? (
                    <img
                      src={m.poster_url}
                      alt={m.title}
                      style={{
                        width: "100%",
                        display: "block",
                        aspectRatio: "2/3",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div style={{ aspectRatio: "2/3", display: "grid", placeItems: "center", color: "#a1a1aa" }}>
                      No poster
                    </div>
                  )}

                  <div className="card-pad" style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div
                        style={{
                          borderRadius: 999,
                          padding: "6px 10px",
                          border: `1px solid ${pill.border}`,
                          background: pill.bg,
                          color: pill.color,
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        Gap {pill.text}
                      </div>

                      <div style={{ fontSize: 12, color: "#a1a1aa" }}>
                        {m.ratings_count} ratings
                      </div>
                    </div>

                    <div style={{ fontWeight: 800, lineHeight: 1.2 }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: "#71717a" }}>Open →</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
