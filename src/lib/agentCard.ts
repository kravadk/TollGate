/** ERC-8004 Agent Card — generate and update agent metadata cards.
 *
 * The on-chain AgentIdentityRegistry stores only agentCardUri (a JSON URL).
 * This module generates and caches the card JSON locally + optionally pins it
 * to 0G Storage via uploadToOgStorage(), returning the URI.
 */

import type { RegistryEntry } from "./registry";

export type AgentReputation = {
  txCount: number;
  successRate: number;    // 0–100 percent
  avgPaymentUsd: number;
  lastActiveAt: string;   // ISO 8601
};

export type AgentCard = {
  schemaVersion: "erc8004-v1";
  agentId: string;
  name: string;
  version: string;
  description?: string;
  agentAddress?: string;
  services: string[];     // serviceId[] this agent provides
  skills: string[];       // e.g. ["sentiment-analysis", "llm-inference"]
  reputation: AgentReputation;
  createdAt: string;
  updatedAt: string;
};

function cardKey(agentId: string) { return `agentCard.${agentId}`; }

const DEFAULT_REPUTATION: AgentReputation = {
  txCount: 0,
  successRate: 100,
  avgPaymentUsd: 0,
  lastActiveAt: new Date().toISOString(),
};

/** Generate (or load cached) ERC-8004 agent card for agentId. */
export function generateCard(agentId: string, overrides?: Partial<AgentCard>): AgentCard {
  try {
    const cached = localStorage.getItem(cardKey(agentId));
    if (cached) {
      const card = JSON.parse(cached) as AgentCard;
      if (overrides) {
        const updated = { ...card, ...overrides, updatedAt: new Date().toISOString() };
        localStorage.setItem(cardKey(agentId), JSON.stringify(updated));
        return updated;
      }
      return card;
    }
  } catch { /* ignore */ }

  const now = new Date().toISOString();
  const card: AgentCard = {
    schemaVersion: "erc8004-v1",
    agentId,
    name: overrides?.name ?? agentId,
    version: "1.0.0",
    description: overrides?.description,
    agentAddress: overrides?.agentAddress,
    services: overrides?.services ?? [],
    skills: overrides?.skills ?? [],
    reputation: overrides?.reputation ?? { ...DEFAULT_REPUTATION },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };

  try {
    localStorage.setItem(cardKey(agentId), JSON.stringify(card));
  } catch { /* ignore */ }
  return card;
}

/** Update reputation fields after a successful payment. */
export function updateReputation(
  agentId: string,
  opts: { amountUsd: number; success?: boolean }
): AgentCard {
  const card = generateCard(agentId);
  const rep = card.reputation;
  const newCount = rep.txCount + 1;
  const totalVolume = rep.avgPaymentUsd * rep.txCount + opts.amountUsd;
  const prevSuccesses = Math.round((rep.successRate / 100) * rep.txCount);
  const newSuccesses = prevSuccesses + (opts.success !== false ? 1 : 0);

  const updated: AgentCard = {
    ...card,
    reputation: {
      txCount: newCount,
      successRate: Math.round((newSuccesses / newCount) * 100),
      avgPaymentUsd: totalVolume / newCount,
      lastActiveAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(cardKey(agentId), JSON.stringify(updated));
  } catch { /* ignore */ }
  return updated;
}

/** Register a service that this agent provides. */
export function registerAgentService(agentId: string, service: Pick<RegistryEntry, "serviceId">): AgentCard {
  const card = generateCard(agentId);
  if (card.services.includes(service.serviceId)) return card;
  return generateCard(agentId, { services: [...card.services, service.serviceId] });
}

/** Export card as a JSON string (for pinning to 0G Storage / IPFS). */
export function exportCardJson(card: AgentCard): string {
  return JSON.stringify(card, null, 2);
}
