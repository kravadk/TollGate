import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

export function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      background: "var(--bg, #0a0a0b)",
      color: "var(--ink, #e8e8ea)",
      fontFamily: "var(--font-base, system-ui)",
    }}>
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <div style={{
          fontSize: 96, fontWeight: 900, lineHeight: 1,
          background: "linear-gradient(135deg, var(--accent-primary, #6366f1) 0%, #a855f7 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: 12,
        }}>
          402
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>
          Payment-Free Page Not Found
        </h1>
        <p style={{ fontSize: 15, color: "var(--muted, #888)", lineHeight: 1.5, marginBottom: 24 }}>
          The URL you requested isn't a registered TollGate service.
          Even on x402, you can't pay your way to a page that doesn't exist.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "10px 18px", borderRadius: 10,
            background: "var(--accent-primary, #6366f1)", color: "white",
            textDecoration: "none", fontWeight: 700, fontSize: 14,
          }}>
            <Home size={14} /> Project launcher
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 18px", borderRadius: 10,
              background: "var(--bg-2, #1a1a1d)", color: "var(--ink, #e8e8ea)",
              border: "1px solid var(--line-2, #2a2a2d)",
              fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            <ArrowLeft size={14} /> Go back
          </button>
        </div>
        <p style={{ marginTop: 32, fontSize: 12, color: "var(--muted, #888)" }}>
          <code style={{ fontFamily: "monospace" }}>HTTP 404 Not Found</code> — TollGate
        </p>
      </div>
    </div>
  );
}
