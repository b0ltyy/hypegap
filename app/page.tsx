import Link from "next/link";

type TmdbMovie = {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
  vote_average?: number;
};

export default async function HomePage() {
  const apiKey = process.env.TMDB_API_KEY!;

  const res = await fetch(
    `https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return (
      <div className="card card-pad">
        <h1 style={{ marginTop: 0 }}>HypeGap</h1>
        <p style={{ color: "#a1a1aa" }}>TMDB error: {res.status}</p>
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href="/search">
            🔎 Search
          </Link>
          <Link className="btn btn-ghost" href="/surprising">
            🔥 Most Surprising
          </Link>
        </div>
      </div>
    );
  }

  const data = (await res.json()) as { results: TmdbMovie[] };
  const movies = data.results.slice(0, 24);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Hero */}
      <div
        className="card"
        style={{
          padding: 18,
          background:
            "radial-gradient(1200px 500px at 10% 10%, rgba(99,102,241,0.25), transparent 55%), radial-gradient(900px 500px at 90% 40%, rgba(217,70,239,0.18), transparent 60%), rgba(9,9,11,0.6)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ minWidth: 260 }}>
            <div className="badge">New</div>
            <h1 style={{ margin: "10px 0 6px", fontSize: 34, letterSpacing: -0.5 }}>
              Rate vóór & na het kijken.
            </h1>
            <p style={{ margin: 0, color: "#a1a1aa", maxWidth: 680 }}>
              HypeGap toont welke films hun hype waarmaken met één metric:
              <b style={{ color: "#e4e4e7" }}> Expectation Gap</b> = post − pre.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <Link className="btn btn-primary" href="/surprising">
                🔥 Most Surprising
              </Link>
              <Link className="btn btn-ghost" href="/me">
                Mijn account
              </Link>
              <Link className="btn btn-ghost" href="/leaderboard">
                🏆 Leaderboard
              </Link>
            </div>
          </div>

          {/* CTA card (ipv fake search) */}
          <div style={{ width: 360, maxWidth: "100%" }}>
            <div className="card card-pad" style={{ border: "1px solid rgba(39,39,42,0.9)" }}>
              <div className="badge">Discover</div>
              <h2 style={{ margin: "10px 0 6px", fontSize: 18 }}>Zoek eender welke film</h2>
              <p style={{ margin: 0, color: "#a1a1aa", fontSize: 13, lineHeight: 1.45 }}>
                Gebruik de volledige TMDB database en open meteen de film-pagina om te raten.
              </p>

              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <Link className="btn btn-primary" href="/search">
                  🔎 Naar Search
                </Link>
                <Link className="btn btn-ghost" href="/">
                  Trending
                </Link>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#71717a" }}>
                Tip: zoek “Dune 2021” of “Interstellar”.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Trending deze week</h2>
          <p style={{ margin: "6px 0 0", color: "#a1a1aa", fontSize: 13 }}>
            Klik een film → pre-rating → kijk → post-rating → zie de gap.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/search" className="navlink">
            Zoek alles →
          </Link>
          <Link href="/surprising" className="navlink">
            Bekijk ranking →
          </Link>
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
          gap: 14,
        }}
      >
        {movies.map((m) => (
          <Link
            key={m.id}
            href={`/movie/${m.id}`}
            style={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              className="card"
              style={{
                transform: "translateY(0)",
                transition: "150ms",
              }}
            >
              <div style={{ position: "relative" }}>
                {m.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                    alt={m.title}
                    style={{
                      width: "100%",
                      display: "block",
                      aspectRatio: "2 / 3",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      aspectRatio: "2 / 3",
                      display: "grid",
                      placeItems: "center",
                      color: "#a1a1aa",
                    }}
                  >
                    No poster
                  </div>
                )}

                {/* top overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent 55%)",
                  }}
                />
                <div style={{ position: "absolute", left: 10, bottom: 10, right: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{m.title}</div>
                  <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4 }}>
                    {m.release_date ? m.release_date.slice(0, 4) : "—"}
                  </div>
                </div>
              </div>

              <div style={{ padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="badge">Rate → Gap</span>
                <span style={{ fontSize: 12, color: "#a1a1aa" }}>Open</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
