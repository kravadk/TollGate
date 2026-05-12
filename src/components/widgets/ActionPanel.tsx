import type { ReactNode } from "react";

type ActionPanelProps = {
  icon?: ReactNode;
  title: string;
  sub?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Block-styled wrapper for interactive widgets. Sits inside .ap402 content. */
export function ActionPanel({ icon, title, sub, actions, children, className = "" }: ActionPanelProps) {
  return (
    <div className={`panel block svc-flavor ${className}`}>
      <div className="block-head">
        <div className="ttl">
          {icon ? <span className="sq soft">{icon}</span> : null}
          <div>
            <h3>{title}</h3>
            {sub ? <div className="sub">{sub}</div> : null}
          </div>
        </div>
        {actions ? <div className="row sm" style={{ gap: 6 }}>{actions}</div> : null}
      </div>
      <div style={{ padding: "0 16px 16px" }}>{children}</div>
    </div>
  );
}
