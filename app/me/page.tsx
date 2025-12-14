"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type RatingRow = {
  id: string;
  movie_id: number;
  pre_rating: number | null;
  post_rating: number | null;
  created_at: string;
};

type MovieRow = {
  id: number;
  title: string;
  poster_url: string | null;
};

type ProfileRow = {
  points_available: number;
  points_on_hold: number;
  username: string | null;
  avatar_url: string | null;
};

export default function MePage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [moviesById, setMoviesById] = useState<Record<number, MovieRow>>({});
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  // username UI
  const [username, setUsername] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setEmail(null);
        setLoading(false);
        return;
      }

      setEmail(user.email ?? "Ingelogd");

      const meta: any = user.user_metadata ?? {};
      const defaultName =
        meta.full_name ||
        meta.name ||
        (user.email ? user.email.split("@")[0] : null) ||
        null;

      const avatarUrl = meta.avatar_url || meta.picture || null;

      // ensure profile exists
      await supabase.from("profiles").upsert({
        id: user.id,
        avatar_url: avatarUrl,
        username: defaultName, // wordt later overschreven als user zelf kiest
      });

      // load profile
      const { data: p } = await supabase
        .from("profiles")
        .select("points_available, points_on_hold, username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      const pr = (p as ProfileRow) ?? {
        points_available: 0,
        points_on_hold: 0,
        username: defaultName,
        avatar_url: avatarUrl,
      };

      setProfile(pr);
      setUsername(pr.username ?? "");

      // ratings
      const { data: r, error: rErr } = await supabase
        .from("ratings")
        .select("id, movie_id, pre_rating, post_rating, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (rErr) {
        setError(rErr.message);
        setLoading(false);
        return;
      }

      const ratingRows = (r as RatingRow[]) || [];
      setRatings(ratingRows);

      // movies
      const movieIds = Array.from(new Set(ratingRows.map((x) => x.movie_id)));
      if (movieIds.length > 0) {
        const { data: m, error: mErr } = await supabase
          .from("movies")
          .select("id, title, poster_url")
          .in("id", movieIds);

        if (!mErr && m) {
          const map: Record<number, MovieRow> = {};
          (m as MovieRow[]).forEach((row) => {
            map[row.id] = row;
          });
          setMoviesById(map);
        }
      }

      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const total = ratings.length;

    const pre = ratings.filter((r) => r.pre_rating !== null).map((r) => r.pre_rating as number);
    const post = ratings.filter((r) => r.post_rating !== null).map((r) => r.post_rating as number);
    const both = ratings
      .filter((r) => r.pre_rating !== null && r.post_rating !== null)
      .map((r) => (r.post_rating as number) - (r.pre_rating as number));

    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

    return {
      total,
      preCount: pre.length,
      postCount: post.length,
      bothCount: both.length,
      avgPre: avg(pre),
      avgPost: avg(post),
      avgGap: avg(both),
    };
  }, [ratings]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function gapPill(gap: number) {
    if (gap > 0) return { text: `+${gap.toFixed(1)}`, color: "#16a34a", bg: "rgba(22,163,74,0.12)", border: "rgba(22,163,74,0.35)" };
    if (gap < 0) return { text: `${gap.toFixed(1)}`, color: "#dc2626", bg: "rgba(220,38,38,0.10)", border: "rgba(220,38,38,0.35)" };
    return { text: "0.0", color: "#a1a1aa", bg: "rgba(161,161,170,0.08)", border: "rgba(161,161,170,0.25)" };
  }

  function normalizeName(s: string) {
    return s.trim();
  }

  function isValidUsername(s: string) {
    // 3-20 chars, letters/numbers/_ only
    return /^[a-zA-Z0-9_]{3,20}$/.test(s);
  }

  async function saveUsername() {
    setSavingName(true);
    setNameMsg(null);

    try {
      const clean = normalizeName(username);

      if (!isValidUsername(clean)) {
        setNameMsg("❌ Username ongeldig. Gebruik 3–20 tekens: letters, cijfers, underscore.");
        setSavingName(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { error: uErr } = await supabase
        .from("profiles")
        .update({ username: clean })
        .eq("id", user.id);

      if (uErr) {
        // Unique index error => username al bezet
        if ((uErr as any).code === "23505") {
          setNameMsg("❌ Username is al in gebruik.");
        } else {
          setNameMsg(`❌ ${uErr.message}`);
        }
        setSavingName(false);
        return;
      }

      setProfile((p) => (p ? { ...p, username: clean } : p));
      setNameMsg("✅ Username opgeslagen!");
    } finally {
      setSavingName(false);
    }
  }

  if (loading) return <div className="card card-pad">Loading…</div>;

  if (!email) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div className="card card-pad">
          <div className="badge">Account</div>
          <h1 style={{ margin: "10px 0 6px", fontSize: 26, letterSpacing: -0.3 }}>Niet ingelogd</h1>
          <p style={{ margin: 0, color: "#a1a1aa" }}>Log in om je ratings en punten te zien.</p>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <Link className="btn btn-primary" href="/login">Login</Link>
            <Link className="btn btn-ghost" href="/">← Trending</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        className="card"
        style={{
          padding: 18,
          background:
            "radial-gradient(900px 450px at 10% 10%, rgba(99,102,241,0.20), transparent 55%), radial-gradient(900px 450px at 90% 40%, rgba(217,70,239,0.15), transparent 60%), rgba(9,9,11,0.6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="badge">Mijn account</div>
            <h1 style={{ margin: "10px 0 6px", fontSize: 26, letterSpacing: -0.3 }}>
              {profile?.username ? profile.username : "Account"}
            </h1>
            <p style={{ margin: 0, color: "#a1a1aa" }}>
              Ingelogd als: <b style={{ color: "#e4e4e7" }}>{email}</b>
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Link className="btn btn-ghost" href="/leaderboard">🏆 Leaderboard</Link>
            <Link className="btn btn-ghost" href="/surprising">🔥 Ranking</Link>
            <Link className="btn btn-ghost" href="/">Trending</Link>
            <button className="btn btn-primary" onClick={signOut}>Logout</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <div className="badge">Available: {profile?.points_available ?? 0}</div>
          <div className="badge">On hold: {profile?.points_on_hold ?? 0}</div>
          <div className="badge">Unlock: pre + post = +10</div>
        </div>
      </div>

      {/* Username card */}
      <div className="card card-pad" style={{ display: "grid", gap: 10 }}>
        <div className="badge">Username</div>
        <div style={{ color: "#a1a1aa", fontSize: 13 }}>
          Dit is wat anderen zien op de leaderboard. 3–20 tekens: letters, cijfers, underscore.
        </div>

        <input
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="bv. Tibo_19"
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn btn-primary" disabled={savingName} onClick={saveUsername}>
            {savingName ? "Opslaan…" : "Opslaan"}
          </button>
          {nameMsg ? <div style={{ color: nameMsg.startsWith("❌") ? "#fca5a5" : "#86efac" }}>{nameMsg}</div> : null}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <div className="card card-pad">
          <div className="badge">Total</div>
          <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900 }}>{stats.total}</div>
          <div style={{ color: "#a1a1aa", fontSize: 13 }}>ratings gemaakt</div>
        </div>

        <div className="card card-pad">
          <div className="badge">Averages</div>
          <div style={{ marginTop: 10, display: "grid", gap: 6, color: "#e4e4e7" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#a1a1aa" }}>
              <span>avg pre</span>
              <b style={{ color: "#e4e4e7" }}>{stats.avgPre !== null ? stats.avgPre.toFixed(2) : "—"}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#a1a1aa" }}>
              <span>avg post</span>
              <b style={{ color: "#e4e4e7" }}>{stats.avgPost !== null ? stats.avgPost.toFixed(2) : "—"}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#a1a1aa" }}>
              <span>avg gap</span>
              <b style={{ color: stats.avgGap !== null && stats.avgGap > 0 ? "#16a34a" : stats.avgGap !== null && stats.avgGap < 0 ? "#dc2626" : "#e4e4e7" }}>
                {stats.avgGap !== null ? (stats.avgGap > 0 ? "+" : "") + stats.avgGap.toFixed(2) : "—"}
              </b>
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <div className="badge">Progress</div>
          <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 13, color: "#a1a1aa" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>pre gezet</span>
              <b style={{ color: "#e4e4e7" }}>{stats.preCount}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>post gezet</span>
              <b style={{ color: "#e4e4e7" }}>{stats.postCount}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>gap berekend</span>
              <b style={{ color: "#e4e4e7" }}>{stats.bothCount}</b>
            </div>
          </div>
        </div>
      </div>

      {/* Recent ratings */}
      <div className="card card-pad" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Recente ratings</h2>
            <p style={{ margin: "6px 0 0", color: "#a1a1aa", fontSize: 13 }}>
              Klik om terug naar de film te gaan.
            </p>
          </div>
          <Link className="navlink" href="/">Rate meer →</Link>
        </div>

        {ratings.length === 0 ? (
          <div style={{ color: "#a1a1aa" }}>
            Nog geen ratings. Ga naar <Link className="navlink" href="/">Trending</Link>.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {ratings.slice(0, 12).map((r) => {
              const m = moviesById[r.movie_id];
              const title = m?.title ?? `Movie ${r.movie_id}`;
              const poster = m?.poster_url ?? null;

              const gap =
                r.pre_rating !== null && r.post_rating !== null
                  ? r.post_rating - r.pre_rating
                  : null;

              const pill = gap === null ? null : gapPill(gap);

              return (
                <Link key={r.id} href={`/movie/${r.movie_id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="card" style={{ padding: 12, display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(39,39,42,0.9)", background: "rgba(24,24,27,0.8)" }}>
                      {poster ? <img src={poster} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {title}
                      </div>
                      <div style={{ fontSize: 12, color: "#a1a1aa", display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <span>pre: <b style={{ color: "#e4e4e7" }}>{r.pre_rating ?? "—"}</b></span>
                        <span>post: <b style={{ color: "#e4e4e7" }}>{r.post_rating ?? "—"}</b></span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {pill ? (
                        <div style={{ borderRadius: 999, padding: "6px 10px", border: `1px solid ${pill.border}`, background: pill.bg, color: pill.color, fontWeight: 900, fontSize: 12, whiteSpace: "nowrap" }}>
                          gap {pill.text}
                        </div>
                      ) : (
                        <div className="badge">on hold</div>
                      )}
                      <div style={{ color: "#71717a", fontSize: 12 }}>Open →</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
