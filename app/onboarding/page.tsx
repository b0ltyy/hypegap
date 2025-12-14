"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  username: string | null;
};

function normalizeUsername(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const normalized = useMemo(() => normalizeUsername(username), [username]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setEmail(user.email ?? null);

      // haal profiel op
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const profile = data as Profile | null;

      // Als username al bestaat: skip onboarding
      if (profile?.username) {
        window.location.href = "/me";
        return;
      }

      setCurrentUsername(profile?.username ?? null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function saveUsername() {
    setOk(null);
    setError(null);

    if (!normalized || normalized.length < 3) {
      setError("Username moet minstens 3 tekens zijn (letters/cijfers/underscore).");
      return;
    }
    if (normalized.length > 20) {
      setError("Username max 20 tekens.");
      return;
    }

    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      if (!user) {
        window.location.href = "/login";
        return;
      }

      // Check uniqueness (simple)
      const { data: taken, error: takenErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", normalized)
        .limit(1);

      if (takenErr) throw takenErr;
      if ((taken ?? []).length > 0) {
        setError("Username is al bezet. Kies een andere.");
        return;
      }

      // Upsert profile username
      const { error: upErr } = await supabase
        .from("profiles")
        .upsert({ id: user.id, username: normalized }, { onConflict: "id" });

      if (upErr) throw upErr;

      setOk("Username opgeslagen!");
      setTimeout(() => {
        window.location.href = "/me";
      }, 300);
    } catch (e: any) {
      setError(e?.message ?? "Onbekende fout");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="card card-pad">Loading…</div>;
  }

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 560, margin: "0 auto" }}>
      <div className="card card-pad">
        <div className="badge">Onboarding</div>
        <h1 style={{ margin: "10px 0 6px", fontSize: 26, letterSpacing: -0.3 }}>
          Kies je username
        </h1>
        <p style={{ margin: 0, color: "#a1a1aa" }}>
          Dit is hoe je zichtbaar bent op de leaderboard.
        </p>
        {email && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#71717a" }}>
            Ingelogd als: <span style={{ color: "#e4e4e7" }}>{email}</span>
          </div>
        )}
      </div>

      <div className="card card-pad" style={{ display: "grid", gap: 10 }}>
        <label style={{ fontSize: 12, color: "#a1a1aa" }}>Username</label>
        <input
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="bv. tibo_19"
        />
        <div style={{ fontSize: 12, color: "#71717a" }}>
          Preview:{" "}
          <span style={{ color: "#e4e4e7", fontWeight: 800 }}>
            {normalized || "—"}
          </span>{" "}
          (alleen letters, cijfers, underscore)
        </div>

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

        {ok && (
          <div
            className="card"
            style={{
              padding: 12,
              borderColor: "rgba(34,197,94,0.35)",
              background: "rgba(34,197,94,0.08)",
            }}
          >
            ✅ {ok}
          </div>
        )}

        <button className="btn btn-primary" onClick={saveUsername} disabled={saving}>
          {saving ? "Opslaan…" : "Opslaan"}
        </button>

        <div style={{ display: "flex", gap: 12, justifyContent: "space-between", marginTop: 6 }}>
          <Link className="navlink" href="/">
            ← Home
          </Link>
          <Link className="navlink" href="/me">
            Skip →
          </Link>
        </div>
      </div>
    </div>
  );
}
