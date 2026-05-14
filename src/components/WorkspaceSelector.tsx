import { ChevronRight, Receipt, ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { ConnectWalletButton } from "../wallet";
import type { Theme, Workspace, WorkspaceId } from "../types";

type WorkspaceSelectorProps = {
  theme: Theme;
  workspaces: Workspace[];
  onSelect: (id: WorkspaceId) => void;
  onToggleTheme: () => void;
};

function prettyChain(net: string): string {
  const base = net.replace(/-sepolia$/, "").replace(/-testnet$/, "");
  if (base === "0g") return "0G";
  if (base === "qie") return "QIE";
  if (base === "frontier") return "Frontier";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function WorkspaceSelector({
  theme,
  workspaces,
  onSelect,
  onToggleTheme,
}: WorkspaceSelectorProps) {
  return (
    <section className="ws-welcome">
      <div className="ws-welcome__topbar">
        <ConnectWalletButton compact />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <div className="ws-welcome__frame">
        <div className="ws-welcome__banner">
          <span>WELCOME</span>
        </div>

        <div className="ws-welcome__panel">
          <h1 className="ws-welcome__title">CHOOSE YOUR PROJECT</h1>
          <p className="ws-welcome__sub">
            Select a blockchain to work with. You can switch any time from the workspace switcher.
          </p>

          <div className="ws-pick">
            {workspaces.map((workspace) => {
              const Icon = workspace.Icon;
              const chain = prettyChain(workspace.networks[0] ?? "");
              const meta = `${chain} · X402 · ${workspace.shortName.toUpperCase()}`;

              return (
                <button
                  key={workspace.id}
                  className="ws-pick__card"
                  style={
                    {
                      "--c": workspace.accent,
                      "--c-d": workspace.darkAccent,
                    } as React.CSSProperties
                  }
                  type="button"
                  onClick={() => onSelect(workspace.id)}
                >
                  <span className="ws-pick__icon">
                    <Icon size={26} />
                  </span>
                  <span className="ws-pick__body">
                    <span className="ws-pick__name">{workspace.shortName.toLowerCase()}</span>
                    <span className="ws-pick__meta">{meta}</span>
                  </span>
                  <span className="ws-pick__chev">
                    <ChevronRight size={26} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="ws-welcome__foot">
            <a className="ws-welcome__showcase" href="#/showcase">
              <Receipt size={13} />
              Open Receipts Showcase
              <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
