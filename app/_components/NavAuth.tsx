"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function NavAuth() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // init
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
      setLoading(false);
    });

    // listen
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    // houd de layout stabiel
    return <span style={{ width: 120, display: "inline-block" }} />;
  }

  if (!loggedIn) {
    return (
      <Link className="btn btn-ghost" href="/login">
        Login
      </Link>
    );
  }

  return (
    <Link className="btn btn-ghost" href="/me">
      Mijn account
    </Link>
  );
}
