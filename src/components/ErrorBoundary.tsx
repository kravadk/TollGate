import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props  = { children: React.ReactNode; label?: string };
type State  = { hasError: boolean; error: Error | null };

/**
 * Local error boundary so a single widget crash doesn't take down the dashboard.
 * Wrap any widget that does async work, RPC calls, or user input parsing.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (typeof console !== "undefined") {
      console.error("[ErrorBoundary]", this.props.label ?? "widget", error, info);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message ?? "Unknown error";
      return (
        <div className="panel block" style={{
          background: "color-mix(in srgb, #f87171 8%, transparent)",
          border: "1px solid #f8717155",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px" }}>
            <AlertTriangle size={18} style={{ color: "#f87171", marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: ".88rem", color: "#f87171" }}>
                {this.props.label ?? "Widget"} crashed
              </div>
              <div style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 4, wordBreak: "break-word" }}>
                {msg}
              </div>
              <button
                type="button"
                onClick={this.reset}
                style={{
                  marginTop: 10, padding: "5px 12px", borderRadius: 8,
                  background: "var(--bg-2)", border: "1px solid var(--line-2)", color: "var(--ink)",
                  fontSize: ".72rem", fontWeight: 600, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 5,
                }}
              >
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
