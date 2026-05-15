import { ExternalLink } from "lucide-react";

export type EcoLink = { label: string; url: string };
export type EcoGroup = { title: string; items: EcoLink[] };

export function EcosystemLinksPanel({
  groups,
  network,
  accent = "var(--accent-primary)",
}: {
  groups: EcoGroup[];
  network: string;
  accent?: string;
}) {
  return (
    <div style={{ background: "var(--bg-2)", borderRadius: 14, border: "1px solid var(--line-2)", overflow: "hidden", marginTop: 14 }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: ".7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)" }}>Ecosystem Tools</span>
        <span style={{ fontSize: ".62rem", color: accent, fontWeight: 700, background: accent + "18", padding: "2px 8px", borderRadius: 5 }}>{network}</span>
      </div>
      <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {groups.map((g) => (
          <div key={g.title}>
            <div style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 6 }}>{g.title}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {g.items.map((item) => (
                <a
                  key={item.label}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: ".72rem", fontWeight: 700, color: accent,
                    textDecoration: "none", padding: "4px 10px",
                    borderRadius: 7, border: `1px solid ${accent}30`,
                    background: accent + "0d",
                    transition: "background .15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = accent + "22"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = accent + "0d"; }}
                >
                  {item.label}
                  <ExternalLink size={10} />
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
