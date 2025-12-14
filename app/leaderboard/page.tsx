"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type LeaderboardRow = {
  user_id: string;
  username: string | null;
  points_available: number | null;
  points_on_hold: number | null;
};

function TopBadge({ rank }: { rank: number }) {
  const meta =
    rank === 1
      ? { icon: "👑", label: "Champion", fg: "#fde68a", bg: "rgba(250,204,21,0.12)", br: "rgba(250,204,21,0.35)" }
      : rank === 2
      ? { icon: "🥈", label: "Top 2", fg: "#e5e7eb", bg: "rgba(148,163,184,0.12)", br: "rgba(148,163,184,0.35)" }
      : rank === 3
      ? { icon: "🥉", label: "Top 3", fg: "#fdba74", bg: "rgba(249,115,22,0.10)", br: "rgba(249,115,22,0.35)" }
      : { icon: "•", label: `#${rank}`, fg: "#a1a1aa", bg: "rgba(161,161,170,0.08)", br: "rgba(161,161,170,0.20)" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${meta.br}`,
        background: meta.bg,
        color: meta.fg,
        fontWeight: 900,
        fontSize: 12,
        letterSpacing: -0.2,
        whiteSpace: "nowrap",
      }}
      title={meta.label}
    >
      <span style={{ fontSize: 14, lineHeight: 1 }}>{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  );
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [debug, setDebug] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;

        if (!token) {
          throw new Error("Missing bearer token (je moet ingelogd zijn voor leaderboard).");
        }

        const res = await fetch("/api/leaderboard", {
          cache: "no-store",
          headers: { authorization: `Bearer ${token}` },
        });

        const text = await res.text();

        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error(`Leaderboard API error: ${res.status} ${res.statusText}`);
        }

        if (!res.ok) {
          throw new Error(json?.error ?? `Leaderboard API error: ${res.status}`);
        }

        if (!cancelled) {
          const list = (json?.rows ?? []) as LeaderboardRow[];
          setRows(list);
          setDebug({ ok: true, count: list.length });
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ?? "Unknown error");
          setDebug({ ok: false, rawError: String(e?.message ?? e) });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const normalized = useMemo(() => {
    return rows.map((r) => ({
      ...r,
      user_id: String(r.user_id ?? ""),
      username: r.username?.trim() ? r.username : "User",
      points_available: r.points_available ?? 0,
      points_on_hold: r.points_on_hold ?? 0,
    }));
  }, [rows]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card card-pad">
        <div className="badge">Global</div>
        <h1 style={{ margin: "10px 0 6px", fontSize: 26, letterSpacing: -0.3 }}>🏆 Leaderboard</h1>
        <p style={{ margin: 0, color: "#a1a1aa" }}>
          Ranking op basis van <b style={{ color: "#e4e4e7" }}>available points</b>.
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <Link className="btn btn-ghost" href="/surprising">
            🔥 Surprising
          </Link>
          <Link className="btn btn-ghost" href="/discover">
            🎲 Discover
          </Link>
          <Link className="btn btn-ghost" href="/me">
            Mijn account
          </Link>
        </div>
      </div>

      <div className="card card-pad">
        {loading ? (
          <div style={{ color: "#a1a1aa" }}>Loading…</div>
        ) : err ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ color: "#fca5a5", fontWeight: 800 }}>❌ {err}</div>
            <div className="badge">Debug</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#a1a1aa" }}>{JSON.stringify(debug, null, 2)}</pre>
            <Link href="/login" className="navlink">
              Login →
            </Link>
          </div>
        ) : normalized.length === 0 ? (
          <div style={{ color: "#a1a1aa" }}>Nog geen users.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {normalized.map((r, i) => {
              const rank = i + 1;

              // ✅ gegarandeerd unieke key, zelfs als user_id ooit duplicaat/leeg is
              const key = `${r.user_id || "user"}:${rank}:${i}`;

              return (
                <div
                  key={key}
                  className="card"
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <TopBadge rank={rank} />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 900,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.username}
                      </div>
                      <div style={{ fontSize: 12, color: "#a1a1aa" }}>hold: {r.points_on_hold}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{r.points_available}</div>
                    <div style={{ fontSize: 12, color: "#a1a1aa" }}>points</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      
    </div>
  );
}
