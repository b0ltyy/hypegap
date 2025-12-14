"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  username: string | null;
  points_available: number;
  points_on_hold: number;
};

type PendingMovie = {
  title: string;
  poster_url: string | null;
  release_year: number | null;
};

type PendingItem = {
  movie_id: number;
  created_at: string;
  movie: PendingMovie | null;
};

export default function MePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [pending, setPending] = useState<PendingItem[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfileAndPending() {
      setLoading(true);

      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setEmail(user.email ?? null);

      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("id, username, points_available, points_on_hold")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (pErr || !p) {
        setLoading(false);
        return;
      }

      // Force onboarding
      if (!p.username) {
        window.location.href = "/onboarding";
        return;
      }

      setProfile(p as Profile);
      setLoading(false);

      await loadPending(user.id);
    }

    async function loadPending(userId: string) {
      setPendingLoading(true);
      setPendingError(null);

      const { data, error } = await supabase
        .from("ratings")
        .select(
          `
          movie_id,
          created_at,
          movies (
            title,
            poster_url,
            release_year
          )
        `
        )
        .eq("user_id", userId)
        .not("pre_rating", "is", null)
        .is("post_rating", null)
        .order("created_at", { ascending: false })
        .limit(8);

      if (cancelled) return;

      if (error) {
        setPendingError(error.message);
        setPending([]);
        setPendingLoading(false);
        return;
      }

      // ✅ Map Supabase response safely -> PendingItem[]
      const mapped: PendingItem[] = (data ?? []).map((row: any) => {
        const m = row.movies ?? null;

        const movie: PendingMovie | null = m
          ? {
              title: typeof m.title === "string" ? m.title : "Untitled",
              poster_url: typeof m.poster_url === "string" ? m.poster_url : null,
              release_year: typeof m.release_year === "number" ? m.release_year : null,
            }
          : null;

        return {
          movie_id: Number(row.movie_id),
          created_at: String(row.created_at),
          movie,
        };
      });

      setPending(mapped);
      setPendingLoading(false);
    }

    loadProfileAndPending();

    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return <div className="card card-pad">Loading…</div>;
  }

  const pendingPotentialPoints = pending.length * 5;

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 900, margin: "0 auto" }}>
      {/* HEADER */}
      <div className="card card-pad">
        <div className="badge">Mijn account</div>
        <h1 style={{ margin: "10px 0 6px", fontSize: 26 }}>
          {profile?.username ?? "Account"}
        </h1>
        {email && (
          <p style={{ margin: 0, color: "#a1a1aa" }}>
            Ingelogd als <b style={{ color: "#e4e4e7" }}>{email}</b>
          </p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <Link className="btn btn-ghost" href="/leaderboard">
            🏆 Leaderboard
          </Link>
          <Link className="btn btn-ghost" href="/surprising">
            🔥 Surprising
          </Link>
          <Link className="btn btn-ghost" href="/search">
            🔎 Search
          </Link>
        </div>
      </div>

      {/* POINTS */}
      <div className="card card-pad">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 12, color: "#a1a1aa" }}>Available</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>
              {profile?.points_available ?? 0}
            </div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 12, color: "#a1a1aa" }}>On hold</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>
              {profile?.points_on_hold ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* PENDING */}
      <div className="card card-pad">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="badge">Pending</div>
            <h2 style={{ margin: "8px 0 6px", fontSize: 18 }}>
              Post-ratings nog te doen
            </h2>
            <p style={{ margin: 0, color: "#a1a1aa", fontSize: 13 }}>
              Je hebt <b style={{ color: "#e4e4e7" }}>{pending.length}</b> open items.
              Dat is <b style={{ color: "#e4e4e7" }}>{pendingPotentialPoints}</b> punten die je kan unlocken.
            </p>
          </div>

          <Link className="btn btn-primary" href="/search">
            🔎 Zoek films
          </Link>
        </div>

        <div style={{ height: 12 }} />

        {pendingLoading && <div className="card card-pad">Loading…</div>}

        {pendingError && (
          <div
            className="card"
            style={{
              padding: 12,
              borderColor: "rgba(220,38,38,0.45)",
              background: "rgba(220,38,38,0.08)",
              whiteSpace: "pre-wrap",
            }}
          >
            ❌ {pendingError}
          </div>
        )}

        {!pendingLoading && !pendingError && pending.length === 0 && (
          <div className="card" style={{ padding: 12 }}>
            ✅ Geen open post-ratings. Goed bezig.
          </div>
        )}

        {!pendingLoading && !pendingError && pending.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 12,
              marginTop: 12,
            }}
          >
            {pending.map((p) => {
              const title = p.movie?.title ?? `Movie #${p.movie_id}`;
              const poster = p.movie?.poster_url ?? null;

              return (
                <Link
                  key={p.movie_id}
                  href={`/movie/${p.movie_id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="card" style={{ overflow: "hidden" }}>
                    {poster ? (
                      <img
                        src={poster}
                        alt={title}
                        style={{
                          width: "100%",
                          aspectRatio: "2 / 3",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          aspectRatio: "2 / 3",
                          display: "grid",
                          placeItems: "center",
                          color: "#a1a1aa",
                        }}
                      >
                        No poster
                      </div>
                    )}

                    <div style={{ padding: 10 }}>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>{title}</div>
                      <div style={{ marginTop: 6 }}>
                        <span className="badge">Post-rate → +5</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="card card-pad">
        <button className="btn btn-primary" onClick={logout}>
          Logout
        </button>

        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between" }}>
          <Link className="navlink" href="/">
            ← Home
          </Link>
          <Link className="navlink" href="/onboarding">
            Username wijzigen →
          </Link>
        </div>
      </div>
    </div>
  );
}
