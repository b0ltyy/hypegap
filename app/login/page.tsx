"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  username: string | null;
};

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let unsub: { data: { subscription: { unsubscribe: () => void } } } | null = null;
    let cancelled = false;

    async function routeUser() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        if (!cancelled) setChecking(false);
        return;
      }

      const { data: p, error } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        router.replace("/me");
        return;
      }

      const profile = p as Profile | null;

      if (!profile?.username) router.replace("/onboarding");
      else router.replace("/me");
    }

    (async () => {
      await routeUser();

      unsub = supabase.auth.onAuthStateChange(async (event) => {
        if (event === "SIGNED_IN") {
          await routeUser();
        }
      });

      if (!cancelled) setChecking(false);
    })();

    return () => {
      cancelled = true;
      unsub?.data.subscription.unsubscribe();
    };
  }, [router]);

  if (checking) {
    return (
      <div style={{ maxWidth: 520, margin: "90px auto", display: "grid", gap: 14 }}>
        <div className="card card-pad">
          <div className="badge">Account</div>
          <h1 style={{ margin: "10px 0 6px", fontSize: 26, letterSpacing: -0.3 }}>Login</h1>
          <p style={{ margin: 0, color: "#a1a1aa" }}>Even checken of je al ingelogd bent…</p>
        </div>
        <div className="card card-pad">Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "90px auto", display: "grid", gap: 14 }}>
      <div className="card card-pad">
        <div className="badge">HypeGap</div>
        <h1 style={{ margin: "10px 0 6px", fontSize: 26, letterSpacing: -0.3 }}>Login</h1>
        <p style={{ margin: 0, color: "#a1a1aa" }}>
          Nieuw account? Na signup kies je meteen een <b style={{ color: "#e4e4e7" }}>username</b>.
        </p>
      </div>

      <div className="card card-pad">
        <Auth
          supabaseClient={supabase}
          providers={["google"]}
          view="sign_in"
          showLinks
          redirectTo={
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : undefined
          }
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "#6366f1",
                  brandAccent: "#4f46e5",
                  inputBackground: "rgba(24,24,27,0.9)",
                  inputBorder: "rgba(63,63,70,0.9)",
                  inputText: "#e4e4e7",
                  inputLabelText: "#a1a1aa",
                  defaultButtonBackground: "rgba(99,102,241,0.15)",
                  defaultButtonBackgroundHover: "rgba(99,102,241,0.25)",
                  defaultButtonBorder: "rgba(99,102,241,0.35)",
                  defaultButtonText: "#e4e4e7",
                },
                radii: {
                  borderRadiusButton: "14px",
                  buttonBorderRadius: "14px",
                  inputBorderRadius: "14px",
                },
              },
            },
            style: {
              container: { width: "100%" },
              label: { color: "#a1a1aa" },
              input: {
                background: "rgba(24,24,27,0.9)",
                color: "#e4e4e7",
                borderColor: "rgba(63,63,70,0.9)",
                borderRadius: "14px",
              },
              button: { borderRadius: "14px", fontWeight: 800 },
              message: { color: "#e4e4e7" },
              anchor: { color: "#a5b4fc" },
            },
          }}
        />
      </div>
    </div>
  );
}
