"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  username: string | null;
  points_available?: number | null;
  points_on_hold?: number | null;
};

type PendingItem = {
  movie_id: number;
  created_at: string;
  movies?: {
    title: string | null;
    poster_path: string | null;
    release_year: string | null;
  } | null;
};

export default function MePage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [pendingLoading, setPendingLoading] = useState(true);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const pendingCount = useMemo(() => pending.length, [pending]);
  const pendingPotentialPoints = useMemo(() => pendingCount * 5, [pendingCount]); // jouw rule: post-rating unlockt points

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setEmail(user.email ?? null);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, points_available, points_on_hold")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setLoading(false);
        return;
      }

      const p = (data ?? { id: user.id, username: null }) as Profile;

      // ✅ FORCE onboarding
      if (!p.username) {
        window.location.href = "/onboarding";
        return;
      }

      setProfile(p);
      setLoading(false);

      // Load pending list (pre gedaan maar nog geen post)
      await loadPending();
    })();

    async function loadPending() {
      setPendingLoading(true);
      setPendingError(null);

      try {
        const { data: sess } = await supabase.auth.getSession();
        const user = sess.session?.user;
        if (!user) return;

        // ratings table assumed: (user_id, movie_id, pre_rating, post_rating, created_at)
        // pending = pre_rating is not null AND post_rating is null
        const { data, error } = await supabase
          .from("ratings")
          .select(
            "movie_id, created_at, movies(title, poster_path, release_year)"
          )
          .eq("user_id", user.id)
          .not("pre_rating", "is", null)
          .is("post_rating", null)
          .order("created_at", { ascending: false })
          .limit(8);

        if (error) throw error;

        setPending((data ?? []) as any);
      } catch (e: any) {
        setPendingError(e?.message ?? "Pending load error");
      } finally {
        setPendingLoading(false);
      }
    }

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

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 820, margin: "0 auto" }}>
      {/* Header */}
      <div className="card card-pad">
        <div className="badge">Mijn account</div>
        <h1 style={{ margin: "10px 0 6px", fontSize: 26, letterSpacing: -0.3 }}>
          {profile?.username ?? "Account"}
        </h1>
        {email && (
          <p style={{ margin: 0, color: "#a1a1aa" }}>
            Ingelogd als: <b style={{ color: "#e4e4e7" }}>{email}</b>
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

      {/* Points */}
      <div className="card card-pad" style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontSize: 12, color: "#a1a1aa" }}>Available points</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>
              {profile?.points_available ?? 0}
            </div>
            <div style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>
              Telt mee voor leaderboard.
            </div>
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontSize: 12, color: "#a1a1aa" }}>On hold</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>
              {profile?.points_on_hold ?? 0}
            </div>
            <div style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>
              Unlock je door post-ratings te doen.
            </div>
          </div>
        </div>
      </div>

      {/* Pending block */}
      <div className="card card-pad">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="badge">Pending</div>
            <h2 style={{ margin: "10px 0 6px", fontSize: 18 }}>
              Post-ratings die nog open staan
            </h2>
            <p style={{ margin: 0, color: "#a1a1aa", fontSize: 13 }}>
              Je hebt <b style={{ color: "#e4e4e7" }}>{pendingCount}</b> films waar je pre-rating al gedaan is,
              maar post-rating nog niet. Dat is{" "}
              <b style={{ color: "#e4e4e7" }}>{pendingPotentialPoints}</b> punten die je kan unlocken.
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

        {!pendingLoading && !pendingError && pendingCount === 0 && (
          <div
            className="card"
            style={{
              padding: 12,
              borderColor: "rgba(39,39,42,0.9)",
              background: "rgba(24,24,27,0.5)",
            }}
          >
            ✅ Nice. Je hebt geen open post-ratings.  
            <div style={{ marginTop: 8, color: "#a1a1aa", fontSize: 13 }}>
              Tip: rate een film vóór het kijken, en kom terug om je punten te unlocken.
            </div>
            <div style={{ marginTop: 10 }}>
              <Link className="navlink" href="/surprising">
                Bekijk Most Surprising →
              </Link>
            </div>
          </div>
        )}

        {!pendingLoading && !pendingError && pendingCount > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {pending.map((p) => {
              const title = p.movies?.title ?? `Movie #${p.movie_id}`;
              const poster = p.movies?.poster_path
                ? `https://image.tmdb.org/t/p/w342${p.movies.poster_path}`
                : null;

              return (
                <Link
                  key={p.movie_id}
                  href={`/movie/${p.movie_id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="card" style={{ overflow: "hidden" }}>
                    <div style={{ position: "relative" }}>
                      {poster ? (
                        <img
                          src={poster}
                          alt={title}
                          style={{ width: "100%", display: "block", aspectRatio: "2 / 3", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ aspectRatio: "2 / 3", display: "grid", placeItems: "center", color: "#a1a1aa" }}>
                          No poster
                        </div>
                      )}

                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent 55%)",
                        }}
                      />
                      <div style={{ position: "absolute", left: 10, bottom: 10, right: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>
                          {title}
                        </div>
                        <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span className="badge">Post-rating →</span>
                          <span className="badge">Unlock +5</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#a1a1aa" }}>Open</span>
                      <span className="navlink">Ga →</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="card card-pad" style={{ display: "grid", gap: 10 }}>
        <button className="btn btn-primary" onClick={logout}>
          Logout
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
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
