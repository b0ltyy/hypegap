"use client";

import { useEffect, useState } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        window.location.href = "/me";
        return;
      }
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return <div className="card card-pad">Loading…</div>;
  }

  return (
    <div className="card card-pad" style={{ maxWidth: 520, margin: "60px auto" }}>
      <div className="badge">Login</div>
      <h1 style={{ margin: "10px 0 6px", fontSize: 26, letterSpacing: -0.3 }}>Log in</h1>
      <p style={{ margin: 0, color: "#a1a1aa" }}>
        Je gebruikt Google om je ratings, punten en leaderboard op te slaan.
      </p>

      <div style={{ marginTop: 14 }}>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={["google"]}
          redirectTo={`${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`}
        />
      </div>
    </div>
  );
}
