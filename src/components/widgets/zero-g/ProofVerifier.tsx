import { useState } from "react";
import { Check, Shield, X } from "lucide-react";
import type { Workspace } from "../../../types";
import { useAppState } from "../../../app-state";
import { ActionPanel } from "../ActionPanel";

type VerifyResult =
  | { kind: "ok"; receiptId: string; receiptKind?: string; createdAt: string; payload?: Record<string, unknown> }
  | { kind: "missing"; receiptId: string }
  | { kind: "idle" };

export function ProofVerifier({ workspace }: { workspace: Workspace }) {
  const { receipts } = useAppState();
  const [input, setInput] = useState("");
  const [out, setOut] = useState<VerifyResult>({ kind: "idle" });

  const verify = () => {
    const id = input.trim();
    if (!id) return;
    const r = receipts.find((x) => x.id === id);
    if (!r) {
      setOut({ kind: "missing", receiptId: id });
      return;
    }
    setOut({ kind: "ok", receiptId: r.id, receiptKind: r.kind, createdAt: r.createdAt, payload: r.payload });
  };

  const lastIds = receipts.filter((r) => r.workspaceId === workspace.id).slice(0, 4).map((r) => r.id);

  return (
    <ActionPanel
      icon={<Shield width={15} height={15} />}
      title="Verify a receipt proof"
      sub="Paste a receipt id to inspect the signed proof + payload. Each receipt is single-use; the gateway verifies server-side."
      actions={
        <button className="btn btn-acc btn-sm" type="button" onClick={verify} disabled={!input.trim()}>
          <Shield width={13} height={13} /> Verify
        </button>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Receipt id</span>
          <input
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            placeholder="rcpt_…"
            style={{ padding: "9px 11px", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: ".82rem" }}
          />
        </label>
        {lastIds.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontSize: ".64rem", color: "var(--muted)", fontWeight: 600, alignSelf: "center" }}>Recent:</span>
            {lastIds.map((id) => (
              <button key={id} type="button" className="pill click" onClick={() => setInput(id)} style={{ fontFamily: "var(--mono)", fontSize: ".68rem" }}>{id}</button>
            ))}
          </div>
        )}
      </div>

      {out.kind === "ok" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 12%, transparent)", color: "var(--green)", fontSize: ".78rem", fontWeight: 700, marginBottom: 8 }}>
            <Check width={14} height={14} /> Signed proof valid · {out.receiptKind ?? "payment"} · {new Date(out.createdAt).toLocaleString()}
          </div>
          {out.payload && Object.keys(out.payload).length > 0 && (
            <pre className="code-block" style={{ fontSize: ".74rem", maxHeight: 220, overflow: "auto" }}>{JSON.stringify(out.payload, null, 2)}</pre>
          )}
        </div>
      )}
      {out.kind === "missing" && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--red) 14%, transparent)", color: "var(--red)", fontSize: ".78rem", fontWeight: 700 }}>
          <X width={14} height={14} /> No receipt found for <code style={{ marginLeft: 4, background: "rgba(0,0,0,.16)", padding: "1px 5px", borderRadius: 5 }}>{out.receiptId}</code>
        </div>
      )}
    </ActionPanel>
  );
}
