import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  LockKeyhole,
  MessageCircle,
  X,
} from "lucide-react";
import type { Agent, PaymentStage, Service, Workspace } from "../types";

type PaymentModalProps = {
  agent: Agent;
  service: Service | null;
  workspace: Workspace | null;
  onApproved: (service: Service) => void;
  onClose: () => void;
};

const stageContent: Record<
  PaymentStage,
  { eyebrow: string; title: string; detail: string; button: string }
> = {
  required: {
    eyebrow: "402 Payment Required",
    title: "Invoice",
    detail: "The agent needs one paid request before the API returns data.",
    button: "Hold to Pay",
  },
  holding: {
    eyebrow: "Hold authorization",
    title: "Invoice",
    detail: "Keeping this request inside the agent policy and budget cap.",
    button: "Keep holding",
  },
  verifying: {
    eyebrow: "Verifying",
    title: "Verifying invoice",
    detail: "Payment submitted. Waiting for receipt verification.",
    button: "Verifying...",
  },
  approved: {
    eyebrow: "Approved",
    title: "Invoice paid",
    detail: "Receipt is verified and the provider can unlock the response.",
    button: "Approved",
  },
  unlocked: {
    eyebrow: "API Response Unlocked",
    title: "Response unlocked",
    detail: "The agent can now consume this paid response and continue.",
    button: "Response unlocked",
  },
};

export function PaymentModal({
  agent,
  service,
  workspace,
  onApproved,
  onClose,
}: PaymentModalProps) {
  const [stage, setStage] = useState<PaymentStage>("required");
  const timers = useRef<number[]>([]);
  const sentReceipt = useRef(false);
  const activeServiceId = service?.id;

  useEffect(() => {
    setStage("required");
    sentReceipt.current = false;
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  }, [activeServiceId]);

  useEffect(() => {
    return () => timers.current.forEach(window.clearTimeout);
  }, []);

  const content = stageContent[stage];

  const networkTag = useMemo(() => {
    if (!service) {
      return "Testnet";
    }

    return service.network.replace(" Sepolia", "");
  }, [service]);

  if (!service) {
    return null;
  }

  const startPayment = () => {
    if (stage !== "required") {
      return;
    }

    setStage("holding");
    timers.current.forEach(window.clearTimeout);
    timers.current = [
      window.setTimeout(() => setStage("verifying"), 780),
      window.setTimeout(() => setStage("approved"), 1650),
      window.setTimeout(() => {
        if (!sentReceipt.current) {
          sentReceipt.current = true;
          onApproved(service);
        }

        setStage("unlocked");
      }, 2350),
    ];
  };

  const cancelHold = () => {
    if (stage !== "holding") {
      return;
    }

    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setStage("required");
  };

  const isDone = stage === "approved" || stage === "unlocked";
  const isBusy = stage === "holding" || stage === "verifying";

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-label="Payment modal"
        aria-modal="true"
        className={`payment-modal payment-modal--${stage}`}
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="payment-modal__top">
          <button className="round-icon" type="button" onClick={onClose}>
            <X size={17} />
          </button>
          <span className="invoice-chip">IN-402</span>
          <button className="round-icon" type="button">
            <MessageCircle size={17} />
          </button>
        </header>

        <div className="paper-stack">
          <div className="paper-stack__sheet">
            <div className="paper-stack__dates">
              <span>
                <small>ISSUED</small>
                {new Date().toLocaleDateString("uk-UA")}
              </span>
              <span>
                <small>DUE</small>
                instant
              </span>
            </div>
            <div className="paper-stack__columns">
              <small>DESCRIPTION</small>
              <small>PRICE</small>
              <small>NETWORK</small>
            </div>
            <div className="paper-stack__row">
              <span>{service.name}</span>
              <strong>{service.price}</strong>
              <span>{networkTag}</span>
            </div>
            <div className="paper-stack__row is-muted">
              <span>{service.category}</span>
              <strong>{agent.maxPerRequest}</strong>
              <span>x402</span>
            </div>
          </div>
        </div>

        <div className="payment-sheet">
          <span className="sheet-grabber" />
          <div className="payment-sheet__title-row">
            <div>
              <p className="eyebrow">{content.eyebrow}</p>
              <h2>{content.title}</h2>
            </div>
            <span className={isDone ? "payment-status is-approved" : "payment-status"}>
              {isDone ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
              {isDone ? "Approved" : "Pending"}
            </span>
          </div>

          <div className="payment-route">
            <span>
              <small>FROM</small>
              <b>
                <Bot size={16} />
                {agent.name}
              </b>
            </span>
            <span className="route-arrow">
              <ChevronRight size={18} />
            </span>
            <span>
              <small>FOR</small>
              <b>
                <CircleDollarSign size={16} />
                {service.provider}
              </b>
            </span>
          </div>

          <div className="payment-focus">
            <div className="verification-orb">
              <span className="orb-ring orb-ring--one" />
              <span className="orb-ring orb-ring--two" />
              <span className="orb-core">
                {isDone ? <Check size={28} /> : <LockKeyhole size={27} />}
              </span>
            </div>

            <div className="payment-amount">
              <span>{service.price.split(" ")[0]}</span>
              <small>{service.price.split(" ")[1]}</small>
            </div>
          </div>

          <p className="payment-detail">{content.detail}</p>

          {stage === "unlocked" ? (
            <div className="unlocked-response">
              <span>
                <FileText size={16} />
                Provider response
              </span>
              <p>{service.response}</p>
            </div>
          ) : null}

          <button
            className="hold-button"
            disabled={isBusy || isDone}
            type="button"
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                startPayment();
              }
            }}
            onClick={startPayment}
            onPointerDown={startPayment}
            onPointerLeave={cancelHold}
            onPointerUp={cancelHold}
          >
            <span className="hold-button__fill" />
            <span>{content.button}</span>
          </button>

          <p style={{ marginTop: 12, fontSize: ".68rem", lineHeight: 1.4, color: "var(--muted)", textAlign: "center", opacity: 0.85 }}>
            Demo facilitator mode — the 402 handshake is simulated here. The production path verifies a real x402 facilitator / on-chain proof.
            For the live gateway, see the <b>x402 Gateway</b> tab.
          </p>
        </div>
      </section>
    </div>
  );
}
