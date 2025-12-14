"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function getHashParams() {
  const hash = window.location.hash?.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  const sp = new URLSearchParams(hash);
  return {
    access_token: sp.get("access_token"),
    refresh_token: sp.get("refresh_token"),
    expires_in: sp.get("expires_in"),
    token_type: sp.get("token_type"),
    error: sp.get("error"),
    error_description: sp.get("error_description"),
  };
}

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("Callback verwerken…");

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // 1) PKCE flow (code in query)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // 2) Implicit flow (tokens in hash)
          const hp = getHashParams();

          if (hp.error) {
            throw new Error(hp.error_description || hp.error);
          }

          if (!hp.access_token || !hp.refresh_token) {
            throw new Error("Geen tokens in callback URL (geen code en geen access_token). Check redirect URL.");
          }

          const { error } = await supabase.auth.setSession({
            access_token: hp.access_token,
            refresh_token: hp.refresh_token,
          });

          if (error) throw error;
        }

        setMsg("✅ Ingelogd! Doorsturen…");
        window.location.replace("/me");
      } catch (e: any) {
        setMsg(`❌ Auth callback error: ${e?.message ?? "Unknown error"}`);
      }
    })();
  }, []);

  return (
    <div className="card card-pad" style={{ whiteSpace: "pre-wrap" }}>
      <div className="badge">Auth Callback</div>
      <h2 style={{ margin: "10px 0 0" }}>{msg}</h2>
    </div>
  );
}
