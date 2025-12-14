import "./globals.css";
import Link from "next/link";
import { ReactNode } from "react";

export const metadata = {
  title: "HypeGap",
  description: "Rate films vóór en na het kijken. Ontdek welke films hype waarmaken.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl">
      <body>
        {/* Top Navigation */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "rgba(9,9,11,0.85)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            {/* Logo / Brand */}
            <Link
              href="/"
              style={{
                fontWeight: 900,
                letterSpacing: -0.5,
                fontSize: 18,
                color: "#e4e4e7",
                textDecoration: "none",
              }}
            >
              HypeGap
            </Link>

            {/* Nav links */}
            <nav
              style={{
                display: "flex",
                gap: 14,
                marginLeft: 12,
                flexWrap: "wrap",
              }}
            >
              <Link href="/surprising" className="navlink">
                🔥 Surprising
              </Link>

              <Link href="/discover" className="navlink">
                🎲 Discover
              </Link>

              <Link href="/leaderboard" className="navlink">
                🏆 Leaderboard
              </Link>
            </nav>

            {/* Right side */}
            <div style={{ marginLeft: "auto" }}>
              <Link href="/me" className="btn btn-ghost">
                Mijn account
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "20px 16px 48px",
          }}
        >
          {children}
        </main>

        {/* Footer */}
        <footer
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            marginTop: 48,
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "16px",
              fontSize: 12,
              color: "#71717a",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>© {new Date().getFullYear()} HypeGap</span>
            <span>Built for signal, not hype</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
