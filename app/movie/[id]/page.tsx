"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import CastSection from "./CastSection";

export default function MoviePage() {
  const params = useParams();
  const idRaw = (params as any)?.id;
  const movieId = Number(idRaw);

  if (!movieId || Number.isNaN(movieId)) {
    return (
      <div className="card card-pad">
        <h1 style={{ marginTop: 0 }}>Movie</h1>
        <p style={{ color: "#a1a1aa" }}>Ongeldig film id in URL: {String(idRaw ?? "")}</p>
        <Link className="navlink" href="/">
          ← Home
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 980, margin: "0 auto" }}>
      {/* Jouw bestaande movie UI blijft zoals hij is.
          Als jij al een movie detail component hebt, laat die staan.
          Hier tonen we gewoon de cast eronder. */}

      <div className="card card-pad">
        <div className="badge">Movie</div>
        <h1 style={{ margin: "10px 0 0", fontSize: 22 }}>Film #{movieId}</h1>
        <p style={{ margin: "6px 0 0", color: "#a1a1aa", fontSize: 13 }}>
          (Je bestaande movie detail + rating UI staat waarschijnlijk al in jouw versie.
          Deze file is de “safe” versie die altijd rendert.)
        </p>
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btn-ghost" href="/search">
            🔎 Search
          </Link>
          <Link className="btn btn-ghost" href="/surprising">
            🔥 Surprising
          </Link>
        </div>
      </div>

      {/* ✅ NEW: Cast & Crew */}
      <CastSection movieId={movieId} />
    </div>
  );
}
