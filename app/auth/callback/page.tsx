"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("Bezig met inloggen…");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        window.location.href = "/me";
      }
    });

    (async () => {
      // Probeer direct ook
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        window.location.href = "/me";
        return;
      }

      // kleine fallback
      setTimeout(async () => {
        const { data: again } = await supabase.auth.getSession();
        if (again.session) window.location.href = "/me";
        else setMsg("Login gelukt, maar sessie werd niet opgeslagen. Refresh deze pagina.");
      }, 400);
    })();

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return <div className="card card-pad">{msg}</div>;
}
