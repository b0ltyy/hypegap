import "./globals.css";
import Link from "next/link";
import NavAuth from "./_components/NavAuth";

export const metadata = {
  title: "HypeGap",
  description: "Rate films vóór en na het kijken. Ontdek welke films de hype waarmaken.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa" }}>
          <header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 50,
              borderBottom: "1px solid rgba(39,39,42,0.8)",
              background: "rgba(9,9,11,0.7)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              className="container"
              style={{
                height: 56,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Link
                href="/"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div
                  style={{
                    height: 32,
                    width: 32,
                    borderRadius: 14,
                    background: "linear-gradient(135deg, #6366f1, #d946ef)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                  }}
                />
                <div style={{ lineHeight: 1.1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>HypeGap</div>
                  <div style={{ fontSize: 11, color: "#a1a1aa" }}>expectation vs reality</div>
                </div>
              </Link>

              <Link className="navlink" href="/search">Search</Link>


              <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Link className="navlink" href="/surprising">
                  Surprising
                </Link>
                <Link className="navlink" href="/leaderboard">
                  Leaderboard
                </Link>

                {/* ✅ Auth-aware: toont Login of Mijn account */}
                <NavAuth />
              </nav>
            </div>
          </header>

          <main className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
            {children}
          </main>

          <footer style={{ borderTop: "1px solid rgba(39,39,42,0.6)" }}>
            <div className="container" style={{ paddingTop: 24, paddingBottom: 24, fontSize: 12, color: "#71717a" }}>
              © {new Date().getFullYear()} HypeGap — built for signal, not hype.
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
