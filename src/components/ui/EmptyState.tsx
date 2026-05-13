import type { CSSProperties, ReactNode } from "react";
import { Inbox } from "lucide-react";

type Props = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  style?: CSSProperties;
};

/**
 * Reusable empty-state. Use anywhere a list/table can be empty so the UI
 * never collapses into a blank pane.
 *
 *   <EmptyState
 *     title="No receipts yet"
 *     description="Run the A2A demo to generate your first one"
 *     action={<button onClick={runDemo}>Run demo</button>}
 *   />
 */
export function EmptyState({
  title       = "Nothing here yet",
  description,
  icon        = <Inbox size={28} />,
  action,
  style,
}: Props) {
  return (
    <div
      role="status"
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center", padding: "32px 20px",
        background: "var(--bg-2, #1a1a1d)",
        border: "1px dashed var(--line-2, #2a2a2d)",
        borderRadius: 12,
        color: "var(--muted, #888)",
        ...style,
      }}
    >
      <div style={{ color: "var(--muted, #888)", opacity: 0.6, marginBottom: 10 }}>
        {icon}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink, #e8e8ea)", marginBottom: 4 }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 320 }}>
          {description}
        </div>
      )}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}
