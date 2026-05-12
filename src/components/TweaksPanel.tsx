import { useEffect } from "react";
import { X } from "lucide-react";
import type { Workspace, WorkspaceId } from "../types";

export const ACCENTS: [string, string][] = [
  ["#EF6B78", "#F0884F"],
  ["#B7FC72", "#3834FA"],
  ["#3834FA", "#9B4DFF"],
  ["#1FB58A", "#06B6C9"],
];

export const CARD_TONES: [string, string][] = [
  ["#141414", "#1B1B1B"],
  ["#1A1A1A", "#262626"],
  ["#0F1419", "#1B2330"],
];

export const FONTS = ["Plus Jakarta Sans", "Inter", "DM Sans", "Space Grotesk", "Geist"];

const FONT_URLS: Record<string, string> = {
  "Plus Jakarta Sans": "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
  "Inter": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
  "Geist": "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap",
  "Space Grotesk": "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap",
  "DM Sans": "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap",
};

export type TweakState = {
  accent: [string, string];
  cardTone: [string, string];
  lightBg: boolean;
  font: string;
  radius: number;
};

export const DEFAULT_TWEAKS: TweakState = {
  accent: ACCENTS[0],
  cardTone: CARD_TONES[0],
  lightBg: false,
  font: "Plus Jakarta Sans",
  radius: 18,
};

export function tweakVars(t: TweakState): React.CSSProperties {
  const [a1, a2] = t.accent;
  const [c1, c2] = t.cardTone;
  return {
    "--acc": a1,
    "--acc-2": a2,
    "--acc-deep": a1,
    "--acc-grad": `linear-gradient(135deg, ${a1} 0%, ${a2} 100%)`,
    "--acc-soft": `${a1}22`,
    "--acc-tint": `${a1}11`,
    "--acc-link": a1,
    "--card-d": c1,
    "--card-d-2": c2,
    "--card-grad": `linear-gradient(150deg, ${c1} 0%, ${c2} 100%)`,
    "--r": `${t.radius}px`,
    "--r-md": `${Math.round(t.radius * 0.73)}px`,
    "--r-sm": `${Math.round(t.radius * 0.5)}px`,
    "--bg": t.lightBg ? "#faf7f6" : "#f5f0ef",
    "--bg-2": "#ffffff",
    "--sans": `'${t.font}', system-ui, -apple-system, 'Segoe UI', sans-serif`,
  } as React.CSSProperties;
}

type TweaksPanelProps = {
  open: boolean;
  state: TweakState;
  workspaces: Workspace[];
  activeWorkspaceId: WorkspaceId | null;
  onClose: () => void;
  onChange: (s: TweakState) => void;
  onSwitchWorkspace: (id: WorkspaceId) => void;
};

export function TweaksPanel({
  open,
  state,
  workspaces,
  activeWorkspaceId,
  onClose,
  onChange,
  onSwitchWorkspace,
}: TweaksPanelProps) {
  useEffect(() => {
    const url = FONT_URLS[state.font];
    if (!url) return;
    const id = `twk-font-${state.font.replace(/\s+/g, "-")}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }, [state.font]);

  if (!open) return null;

  const set = <K extends keyof TweakState>(key: K, val: TweakState[K]) =>
    onChange({ ...state, [key]: val });

  const accentKey = JSON.stringify(state.accent);
  const toneKey = JSON.stringify(state.cardTone);

  return (
    <div className="twk-panel">
      <div className="twk-hd">
        <b>Tweaks</b>
        <button className="twk-x" type="button" aria-label="Close tweaks" onClick={onClose}>
          <X size={13} />
        </button>
      </div>

      <div className="twk-body">
        <div className="twk-sect">Brand</div>

        <div className="twk-row">
          <div className="twk-lbl"><span>Accent</span></div>
          <div className="twk-chips" role="radiogroup">
            {ACCENTS.map(([a, b], i) => (
              <button
                key={i}
                type="button"
                className="twk-chip"
                role="radio"
                aria-checked={accentKey === JSON.stringify([a, b])}
                data-on={accentKey === JSON.stringify([a, b]) ? "1" : "0"}
                style={{ background: a }}
                onClick={() => set("accent", [a, b])}
              >
                <span><i style={{ background: b }} /></span>
              </button>
            ))}
          </div>
        </div>

        <div className="twk-row">
          <div className="twk-lbl"><span>Card tone</span></div>
          <div className="twk-chips" role="radiogroup">
            {CARD_TONES.map(([a, b], i) => (
              <button
                key={i}
                type="button"
                className="twk-chip"
                role="radio"
                aria-checked={toneKey === JSON.stringify([a, b])}
                data-on={toneKey === JSON.stringify([a, b]) ? "1" : "0"}
                style={{ background: a }}
                onClick={() => set("cardTone", [a, b])}
              >
                <span><i style={{ background: b }} /></span>
              </button>
            ))}
          </div>
        </div>

        <div className="twk-row twk-row-h">
          <div className="twk-lbl"><span>Light background</span></div>
          <button
            type="button"
            className="twk-toggle"
            data-on={state.lightBg ? "1" : "0"}
            role="switch"
            aria-checked={state.lightBg}
            onClick={() => set("lightBg", !state.lightBg)}
          >
            <i />
          </button>
        </div>

        <div className="twk-sect">Type &amp; Shape</div>

        <div className="twk-row">
          <div className="twk-lbl"><span>Font</span></div>
          <select
            className="twk-field"
            value={state.font}
            onChange={(e) => set("font", e.target.value)}
          >
            {FONTS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div className="twk-row">
          <div className="twk-lbl">
            <span>Card radius</span>
            <span className="twk-val">{state.radius}px</span>
          </div>
          <input
            type="range"
            className="twk-slider"
            min={6}
            max={36}
            value={state.radius}
            onChange={(e) => set("radius", Number(e.target.value))}
          />
        </div>

        <div className="twk-sect">Workspace</div>

        <div className="twk-row">
          <div className="twk-lbl"><span>Active</span></div>
          <select
            className="twk-field"
            value={activeWorkspaceId ?? ""}
            onChange={(e) => onSwitchWorkspace(e.target.value as WorkspaceId)}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.shortName}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
