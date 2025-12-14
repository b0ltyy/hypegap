"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  username: string | null;
  points_available?: number | null;
  points_on_hold?: number | null;
};

export default function MePage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

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
        // als je hier ooit errors ziet: laat me weten
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
    })();

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
    <div style={{ display: "grid", gap: 16, maxWidth: 720, margin: "0 auto" }}>
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

      <div className="card card-pad" style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontSize: 12, color: "#a1a1aa" }}>Available points</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>
              {profile?.points_available ?? 0}
            </div>
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontSize: 12, color: "#a1a1aa" }}>On hold</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>
              {profile?.points_on_hold ?? 0}
            </div>
          </div>
        </div>

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
