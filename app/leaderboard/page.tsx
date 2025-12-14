"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Row = {
  rank: number;
  id: string;
  username: string;
  avatar_url: string | null;
  points_available: number;
  points_on_hold: number;
};

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // haal sessie token
        let token: string | null = null;
        for (let i = 0; i < 20; i++) {
          const { data } = await supabase.auth.getSession();
          token = data.session?.access_token ?? null;
          if (token) break;
          await new Promise((r) => setTimeout(r, 100));
        }

        if (!token) {
          if (!cancelled) {
            setError("Niet ingelogd. Log in om de leaderboard te zien.");
            setLoading(false);
          }
          return;
        }

        const res = await fetch("/api/leaderboard", {
          headers: { authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const text = await res.text();
          if (!cancelled) {
            setError(`Leaderboard API error: ${res.status}\n${text}`);
            setLoading(false);
          }
          return;
        }

        const json = await res.json();
        if (!cancelled) {
          setRows(json.rows ?? []);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Onbekende fout");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header */}
      <div className="card card-pad">
        <div className="badge">Global</div>
        <h1 style={{ margin: "10px 0 6px", fontSize: 28, letterSpacing: -0.4 }}>
          🏆 Leaderboard
        </h1>
        <p style={{ margin: 0, color: "#a1a1aa" }}>
          Ranking op basis van <b style={{ color: "#e4e4e7" }}>available points</b>.
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <Link className="btn btn-ghost" href="/">Trending</Link>
          <Link className="btn btn-ghost" href="/me">Mijn account</Link>
        </div>
      </div>

      {/* States */}
      {loading && <div className="card card-pad">Loading…</div>}

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
          <div style={{ marginTop: 10 }}>
            <Link className="navlink" href="/login">Login →</Link>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {!loading && !error && (
        <div className="card card-pad" style={{ display: "grid", gap: 10 }}>
          {rows.map((r) => (
            <div
              key={r.id}
              className="card"
              style={{
                padding: 12,
                display: "grid",
                gridTemplateColumns: "56px 1fr auto",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  border: "1px solid rgba(39,39,42,0.9)",
                  background: "rgba(24,24,27,0.7)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                  fontSize: 18,
                }}
              >
                #{r.rank}
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {r.username}
                </div>
                <div style={{ fontSize: 12, color: "#a1a1aa" }}>
                  hold: {r.points_on_hold}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 950 }}>
                  {r.points_available}
                </div>
                <div style={{ fontSize: 12, color: "#71717a" }}>
                  points
                </div>
              </div>
            </div>
          ))}

          {rows.length === 0 && (
            <div style={{ color: "#a1a1aa" }}>
              Nog geen gebruikers op de leaderboard.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
