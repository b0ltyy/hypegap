"use client";

import { useEffect, useMemo, useState } from "react";

type CastPerson = {
  id: number;
  name: string;
  character?: string;
  profile_path: string | null;
  known_for_department?: string;
};

type CrewPerson = {
  id: number;
  name: string;
  job?: string;
  department?: string;
  profile_path: string | null;
};

export default function CastSection({ movieId }: { movieId: number }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [cast, setCast] = useState<CastPerson[]>([]);
  const [crew, setCrew] = useState<CrewPerson[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);

      try {
        const res = await fetch(`/api/tmdb/credits?movieId=${movieId}`, { cache: "no-store" });
        const text = await res.text();

        if (!res.ok) {
          setErr(text);
          setCast([]);
          setCrew([]);
          return;
        }

        const json = JSON.parse(text);

        const c = Array.isArray(json.cast) ? (json.cast as any[]) : [];
        const cr = Array.isArray(json.crew) ? (json.crew as any[]) : [];

        setCast(
          c.map((p) => ({
            id: Number(p.id),
            name: String(p.name ?? ""),
            character: p.character ? String(p.character) : undefined,
            profile_path: p.profile_path ? String(p.profile_path) : null,
            known_for_department: p.known_for_department ? String(p.known_for_department) : undefined,
          }))
        );

        setCrew(
          cr.map((p) => ({
            id: Number(p.id),
            name: String(p.name ?? ""),
            job: p.job ? String(p.job) : undefined,
            department: p.department ? String(p.department) : undefined,
            profile_path: p.profile_path ? String(p.profile_path) : null,
          }))
        );
      } catch (e: any) {
        setErr(e?.message ?? "Unknown error");
        setCast([]);
        setCrew([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [movieId]);

  const topCrew = useMemo(() => {
    const pickJobs = new Set(["Director", "Writer", "Screenplay", "Producer", "Executive Producer"]);
    const filtered = crew.filter((c) => c.job && pickJobs.has(c.job));
    // unieke (zelfde naam+job niet herhalen)
    const seen = new Set<string>();
    const uniq = filtered.filter((x) => {
      const k = `${x.name}-${x.job}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return uniq.slice(0, 10);
  }, [crew]);

  const visibleCast = showAll ? cast.slice(0, 40) : cast.slice(0, 12);

  const img = (path: string | null) =>
    path ? `https://image.tmdb.org/t/p/w185${path}` : null;

  if (loading) {
    return (
      <div className="card card-pad">
        <div className="badge">Cast</div>
        <div style={{ marginTop: 10, color: "#a1a1aa" }}>Loading…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="card card-pad">
        <div className="badge">Cast</div>
        <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>❌ {err}</div>
      </div>
    );
  }

  return (
    <div className="card card-pad" style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="badge">Cast & Crew</div>
          <h2 style={{ margin: "8px 0 0", fontSize: 18 }}>Acteurs</h2>
        </div>
        {cast.length > 12 && (
          <button className="btn btn-ghost" onClick={() => setShowAll((s) => !s)}>
            {showAll ? "Minder tonen" : "Meer tonen"}
          </button>
        )}
      </div>

      {/* Cast grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10,
        }}
      >
        {visibleCast.map((p) => (
          <div
            key={p.id}
            className="card"
            style={{
              padding: 10,
              display: "flex",
              gap: 10,
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: "rgba(24,24,27,0.9)",
                overflow: "hidden",
                flex: "0 0 auto",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {img(p.profile_path) ? (
                <img
                  src={img(p.profile_path)!}
                  alt={p.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#a1a1aa", fontSize: 12 }}>
                  —
                </div>
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.name}
              </div>
              <div style={{ fontSize: 12, color: "#a1a1aa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.character ? p.character : p.known_for_department ?? ""}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Crew */}
      {topCrew.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#e4e4e7" }}>Crew (top)</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {topCrew.map((c) => (
              <span key={`${c.id}-${c.job}`} className="badge">
                {c.name} — {c.job}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
