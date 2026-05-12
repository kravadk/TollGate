import {
  Bot,
  CircleDollarSign,
  ClipboardCheck,
  FileSearch,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import type { Agent, Receipt, Service, Workspace } from "../types";

type AgentAssistantPanelProps = {
  agent: Agent;
  open: boolean;
  receipts: Receipt[];
  services: Service[];
  workspace: Workspace | null;
  onClose: () => void;
};

export function AgentAssistantPanel({
  agent,
  open,
  receipts,
  services,
  workspace,
  onClose,
}: AgentAssistantPanelProps) {
  const lastReceipt = receipts[0];
  const primaryService = services[0];

  return (
    <aside className={open ? "assistant-panel is-open" : "assistant-panel"}>
      <header className="assistant-panel__header">
        <span className="assistant-brand">
          <Sparkles size={17} />
          TollGate Assistant
        </span>
        <button className="round-icon" type="button" onClick={onClose}>
          <X size={17} />
        </button>
      </header>

      <div className="assistant-panel__body">
        <div className="assistant-hero">
          <span>
            <Bot size={22} />
          </span>
          <h2>{workspace ? workspace.shortName : "Agent"} payment context</h2>
          <p>
            Agent budget, receipt status, provider response, and track-specific
            pitch stay in one place.
          </p>
        </div>

        <div className="assistant-card">
          <span className="assistant-card__title">
            <CircleDollarSign size={16} />
            Spend policy
          </span>
          <div className="assistant-card__grid">
            <span>
              <small>Agent</small>
              {agent.name}
            </span>
            <span>
              <small>Budget</small>
              {agent.budget}
            </span>
            <span>
              <small>Max request</small>
              {agent.maxPerRequest}
            </span>
            <span>
              <small>Status</small>
              {agent.status}
            </span>
          </div>
        </div>

        <div className="assistant-card">
          <span className="assistant-card__title">
            <ClipboardCheck size={16} />
            Latest receipt
          </span>
          <p>
            {lastReceipt
              ? `${lastReceipt.serviceName} was ${lastReceipt.status} on ${lastReceipt.network}.`
              : "No receipts yet."}
          </p>
        </div>

        <div className="assistant-card">
          <span className="assistant-card__title">
            <FileSearch size={16} />
            Demo prompt
          </span>
          <p>
            Explain why {primaryService?.name ?? "this API"} returned 402, pay
            only if it fits my policy, then summarize the unlocked response.
          </p>
        </div>
      </div>

      <form className="assistant-composer">
        <input
          aria-label="Ask assistant"
          placeholder="Ask about receipts, API pricing, or x402 flow..."
          type="text"
        />
        <button type="button">
          <Send size={16} />
        </button>
      </form>
    </aside>
  );
}
