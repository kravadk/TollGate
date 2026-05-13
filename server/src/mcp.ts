/**
 * TollGate MCP (Model Context Protocol) server.
 * Ported from kravadk/XSight- (server/src/routes/mcp.ts), adapted to expose this
 * platform's x402 services as MCP tools so any Claude-powered agent can discover,
 * pay for, and consume paid APIs without bespoke wiring.
 *
 * Protocol: JSON-RPC 2.0, MCP spec 2024-11-05.  Endpoint: POST /mcp  (GET /mcp = discovery)
 */

import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { env, isProd } from "./env.js";
import {
  agentById,
  agents,
  serviceById,
  services,
  userServices,
  addUserService,
  servicesForWorkspace,
} from "./data.js";
import {
  appendReceipt,
  consumeChallenge,
  issueChallenge,
  listReceipts,
  receiptById,
  recordActivity,
} from "./store.js";
import type { Receipt, Service, WorkspaceId } from "./types.js";

export const mcpRouter = Router();

// ─── AgentScore helpers ───────────────────────────────────────────────────────

function agentScoreTier(score: number): string {
  if (score >= 850) return "Platinum";
  if (score >= 700) return "Gold";
  if (score >= 400) return "Silver";
  return "Bronze";
}

function computeAgentScore(agentId: string, receipts: Receipt[]) {
  const count = receipts.length;
  const volumeUsd = receipts.reduce((sum, r) => sum + r.amount, 0);
  const base = Math.min(count * 5, 500);
  const vol = Math.min(Math.floor(volumeUsd), 300);
  const score = Math.min(base + vol, 1000);
  const tier = agentScoreTier(score);
  return {
    agentId,
    score,
    tier,
    receiptCount: count,
    volumeUsd: Math.round(volumeUsd * 100) / 100,
    breakdown: { base, vol, pen: 0 },
    note: "Score computed from x402 receipt history. Formula mirrors AgentCreditRegistry.sol on Mantle.",
  };
}

const WORKSPACE_IDS: WorkspaceId[] = ["0g", "qie", "arbitrum", "mantle", "sui", "agora", "polygon"];

const TOOLS = [
  {
    name: "list_services",
    description: "List paid x402 services on TollGate. Optional workspace filter (0g, qie, arbitrum, mantle, sui, agora, polygon).",
    inputSchema: { type: "object", properties: { workspace: { type: "string", description: "Workspace id to filter by" } }, required: [] },
  },
  {
    name: "get_service",
    description: "Get one paid service by id, including price, network, gateway URL, and sample response shape.",
    inputSchema: { type: "object", properties: { serviceId: { type: "string" } }, required: ["serviceId"] },
  },
  {
    name: "pay_for_service",
    description: "Run the x402 flow for a service: mint a challenge, settle it (dev-bypass in non-production, or a supplied proof), and return the unlocked sample response + receipt id. This is the agent-side 'fetchPaid' equivalent.",
    inputSchema: {
      type: "object",
      properties: {
        serviceId: { type: "string" },
        agentId: { type: "string", description: "Agent making the call (used for receipt + policy check)" },
        proof: {
          type: "object",
          description: "Optional signed payment proof {payTo, amount, asset, network, txHash, payer}. If omitted, dev-bypass is used (non-production only).",
        },
      },
      required: ["serviceId"],
    },
  },
  {
    name: "list_receipts",
    description: "List settled receipts. Optional filters: workspace, serviceId, agentId.",
    inputSchema: {
      type: "object",
      properties: { workspace: { type: "string" }, serviceId: { type: "string" }, agentId: { type: "string" } },
      required: [],
    },
  },
  {
    name: "get_agent_policy",
    description: "Get an agent's spend policy: daily limit, max-per-request, autopay, allowlist, spent today.",
    inputSchema: { type: "object", properties: { agentId: { type: "string" } }, required: ["agentId"] },
  },
  {
    name: "get_agent_score",
    description: "Get an agent's AgentScore (0–1000) derived from its on-chain x402 payment receipt history. Returns score, tier (Bronze/Silver/Gold/Platinum), receipt count, and total volume. Use this to compare agents before hiring them.",
    inputSchema: { type: "object", properties: { agentId: { type: "string" } }, required: ["agentId"] },
  },
  {
    name: "discover_services",
    description: "Discover paid x402 services by keyword, max price, or workspace. Returns services sorted by relevance. Use before tollgate_pay to find the cheapest or best-matched service.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keyword to match against service name/description" },
        maxPriceUsd: { type: "number", description: "Only return services at or below this price" },
        workspace: { type: "string", description: "Filter by workspace (0g, arbitrum, mantle, etc.)" },
      },
      required: [],
    },
  },
  {
    name: "create_service",
    description: "Register a new paid x402 API endpoint on TollGate. Returns a live gateway URL — any agent can immediately discover and pay for it via tollgate_discover + tollgate_pay. ERC-8004 agent card JSON is also generated.",
    inputSchema: {
      type: "object",
      properties: {
        name:           { type: "string",  description: "Human-readable service name, e.g. 'My Sentiment API'" },
        priceUsd:       { type: "number",  description: "Price per call in USD, e.g. 0.05" },
        endpoint:       { type: "string",  description: "Your backend endpoint URL that TollGate will proxy" },
        description:    { type: "string",  description: "Short description of what the service does" },
        category:       { type: "string",  description: "Category tag, e.g. inference, analytics, data (default: custom)" },
        workspace:      { type: "string",  description: "Workspace to list under (0g, arbitrum, mantle, etc.; default: arbitrum)" },
        providerWallet: { type: "string",  description: "EVM address to receive USDC payments (optional)" },
      },
      required: ["name", "priceUsd", "endpoint"],
    },
  },
  {
    name: "verify_receipt",
    description: "Look up a TollGate receipt by ID and verify its status. Returns receipt details including serviceId, agentId, amount, network, status (paid/verified), and timestamps.",
    inputSchema: {
      type: "object",
      properties: {
        receiptId: { type: "string", description: "Receipt ID returned by tollgate_pay, e.g. rcpt_abc123" },
      },
      required: ["receiptId"],
    },
  },
];

function publicService(s: Service) {
  return {
    id: s.id, name: s.name, provider: s.provider, providerWallet: s.providerWallet,
    category: s.category, priceUsd: s.priceUsd, currency: s.currency, network: s.network,
    description: s.description, status: s.status, workspaceIds: s.workspaceIds,
    gatewayUrl: `/api/gateway/${s.id}`, responseShape: s.sampleResponse,
  };
}

function asWorkspace(v: unknown): WorkspaceId | undefined {
  return WORKSPACE_IDS.includes(v as WorkspaceId) ? (v as WorkspaceId) : undefined;
}

type ProofInput = { payTo?: string; amount?: string; asset?: string; network?: string; txHash?: string; payer?: string };

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "list_services": {
      const ws = asWorkspace(args["workspace"]);
      const pool = ws ? servicesForWorkspace(ws) : services;
      return { workspace: ws ?? "all", count: pool.length, services: pool.map(publicService) };
    }

    case "get_service": {
      const s = serviceById(String(args["serviceId"] ?? ""));
      if (!s) return { error: "unknown_service", serviceId: args["serviceId"] ?? null };
      return publicService(s);
    }

    case "get_agent_policy": {
      const a = agentById(String(args["agentId"] ?? ""));
      if (!a) return { error: "unknown_agent", agentId: args["agentId"] ?? null };
      return a;
    }

    case "list_receipts": {
      const ws = asWorkspace(args["workspace"]);
      const rows = listReceipts({
        workspaceId: ws,
        serviceId: args["serviceId"] ? String(args["serviceId"]) : undefined,
        agentId: args["agentId"] ? String(args["agentId"]) : undefined,
      });
      return { count: rows.length, receipts: rows };
    }

    case "pay_for_service": {
      const svc = serviceById(String(args["serviceId"] ?? ""));
      if (!svc || svc.status !== "active") return { error: "unknown_or_inactive_service", serviceId: args["serviceId"] ?? null };

      const agentId = args["agentId"] ? String(args["agentId"]) : "mcp-agent";
      const agent = agentById(agentId);

      // Policy checks (best-effort — agent is optional).
      if (agent) {
        if (agent.status !== "active") return { ok: false, reason: "agent_paused", agentId };
        if (svc.priceUsd > agent.maxPerRequestUsd) return { ok: false, reason: "exceeds_max_per_request", priceUsd: svc.priceUsd, maxPerRequestUsd: agent.maxPerRequestUsd };
        if (agent.spentTodayUsd + svc.priceUsd > agent.dailyLimitUsd) return { ok: false, reason: "exceeds_daily_limit", spentTodayUsd: agent.spentTodayUsd, dailyLimitUsd: agent.dailyLimitUsd };
        if (agent.allowlist.length > 0 && !agent.allowlist.includes(svc.id)) return { ok: false, reason: "service_not_allowlisted", serviceId: svc.id };
      }

      const payTo = svc.providerWallet || env.x402PayoutAddress;
      const requestHash = "0xmcp" + Buffer.from(`${svc.id}:${agentId}:${Date.now()}`).toString("hex").slice(0, 60);
      const ch = issueChallenge({ serviceId: svc.id, amount: svc.priceUsd.toString(), currency: svc.currency, network: svc.network, payTo, requestHash });

      const proof = (args["proof"] ?? null) as ProofInput | null;
      let payer = "mcp:dev-bypass";
      let txHash: string | undefined;
      let verified = false;

      if (proof) {
        const isAddr = typeof proof.payTo === "string" && /^0x[0-9a-fA-F]{40}$/.test(proof.payTo);
        const valid =
          isAddr &&
          proof.payTo!.toLowerCase() === payTo.toLowerCase() &&
          Number(proof.amount) >= svc.priceUsd &&
          proof.network === svc.network &&
          proof.asset === svc.currency;
        if (!valid) {
          return { ok: false, reason: "payment_verification_failed", expected: { payTo, amount: svc.priceUsd, asset: svc.currency, network: svc.network } };
        }
        payer = proof.payer ?? proof.payTo!;
        txHash = proof.txHash;
        verified = Boolean(proof.txHash);
      } else if (isProd()) {
        return { ok: false, reason: "proof_required_in_production" };
      }

      const consumed = consumeChallenge(ch.challengeId, svc.id, requestHash);
      if (!consumed.ok) return { ok: false, reason: consumed.reason };

      const ws = svc.workspaceIds[0] ?? "unknown";
      const receipt = appendReceipt({
        challengeId: ch.challengeId,
        workspaceId: ws,
        serviceId: svc.id,
        serviceName: svc.name,
        agentId,
        payerWallet: payer,
        providerWallet: payTo,
        amount: svc.priceUsd,
        currency: svc.currency,
        network: svc.network,
        txHash,
        requestHash,
        status: verified ? "verified" : "paid",
        paidAt: new Date().toISOString(),
        verifiedAt: verified ? new Date().toISOString() : undefined,
      });

      return {
        ok: true,
        serviceId: svc.id,
        name: svc.name,
        amountPaidUsd: svc.priceUsd,
        currency: svc.currency,
        network: svc.network,
        data: svc.sampleResponse,
        receiptId: receipt.id,
        receipt,
        note: proof ? "x402 payment verified." : "dev-bypass: simulated settlement; production requires a real proof.",
      };
    }

    case "get_agent_score": {
      const agentId = String(args["agentId"] ?? "");
      const receipts = listReceipts({ agentId });
      const score = computeAgentScore(agentId, receipts);
      return score;
    }

    case "discover_services": {
      const query = args["query"] ? String(args["query"]).toLowerCase() : "";
      const maxPrice = typeof args["maxPriceUsd"] === "number" ? args["maxPriceUsd"] : Infinity;
      const ws = asWorkspace(args["workspace"]);
      const pool = ws ? servicesForWorkspace(ws) : services;
      const filtered = pool
        .filter((s) => s.status === "active" && s.priceUsd <= maxPrice)
        .filter((s) => !query || s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query))
        .sort((a, b) => a.priceUsd - b.priceUsd);
      return { count: filtered.length, services: filtered.map(publicService) };
    }

    case "create_service": {
      const svcName = String(args["name"] ?? "").trim();
      if (!svcName) return { error: "name_required" };
      if (svcName.length > 80) return { error: "name_too_long", maxLength: 80 };

      const price = Number(args["priceUsd"] ?? 0);
      if (!Number.isFinite(price) || price <= 0) return { error: "priceUsd_must_be_positive" };
      if (price > 10_000) return { error: "priceUsd_too_high", maxUsd: 10_000 };

      const endpoint = String(args["endpoint"] ?? "").trim();
      if (!endpoint) return { error: "endpoint_required" };
      try {
        const u = new URL(endpoint);
        if (u.protocol !== "https:" && u.protocol !== "http:") return { error: "endpoint_invalid_protocol", expected: "http(s)" };
      } catch {
        return { error: "endpoint_invalid_url" };
      }
      if (endpoint.length > 500) return { error: "endpoint_too_long", maxLength: 500 };

      const description = typeof args["description"] === "string" ? args["description"].slice(0, 500) : `Custom paid API: ${svcName}`;
      const category = typeof args["category"] === "string" && /^[a-z0-9_-]{2,40}$/i.test(args["category"]) ? args["category"] : "custom";

      const providerWalletInput = typeof args["providerWallet"] === "string" ? args["providerWallet"].trim() : "";
      if (providerWalletInput && !/^0x[0-9a-fA-F]{40}$/.test(providerWalletInput)) {
        return { error: "providerWallet_invalid", expected: "0x-prefixed 40-hex address" };
      }
      const providerWallet = providerWalletInput || env.x402PayoutAddress;

      const ws = asWorkspace(args["workspace"]) ?? "arbitrum";
      const slug = svcName.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24);
      const serviceId = `svc_user_${slug}_${randomUUID().replace(/-/g, "").slice(0, 8)}`;

      const newSvc: import("./types.js").Service = {
        id: serviceId,
        name: svcName,
        provider: "Agent-registered via MCP",
        providerWallet,
        category,
        priceUsd: Math.round(price * 10000) / 10000,
        currency: env.x402Asset,
        network: ws === "arbitrum" ? "arbitrum-sepolia" : ws === "mantle" ? "mantle-mainnet" : ws === "0g" ? "0g-mainnet" : "arbitrum-sepolia",
        description,
        status: "active",
        workspaceIds: [ws],
        sampleResponse: { status: "ok", source: endpoint.slice(0, 60) },
      };

      addUserService(newSvc);

      const origin = process.env.SERVER_URL ?? "https://tollgate-1.onrender.com";
      const gatewayUrl = `${origin}/api/gateway/${serviceId}`;
      const agentCard = {
        "@type": "AgentCard",
        "erc": "ERC-8004",
        "serviceId": serviceId,
        "name": svcName,
        "priceUsd": price,
        "currency": "USDC",
        "network": newSvc.network,
        "gatewayUrl": gatewayUrl,
        "endpoint": endpoint,
        "registeredAt": new Date().toISOString(),
        "protocol": "x402",
      };

      return {
        ok: true,
        serviceId,
        name: svcName,
        priceUsd: price,
        network: newSvc.network,
        workspace: ws,
        gatewayUrl,
        agentCardJson: agentCard,
        note: "Service is live immediately. Use tollgate_discover to verify, then tollgate_pay to consume it.",
      };
    }

    case "verify_receipt": {
      const receiptId = String(args["receiptId"] ?? "").trim();
      if (!receiptId) return { error: "receiptId_required" };
      const r = receiptById(receiptId);
      if (!r) return { error: "receipt_not_found", receiptId };
      return {
        receiptId: r.id,
        serviceId: r.serviceId,
        serviceName: r.serviceName,
        agentId: r.agentId,
        amountUsd: r.amount,
        currency: r.currency,
        network: r.network,
        status: r.status,
        paidAt: r.paidAt,
        verifiedAt: r.verifiedAt,
        txHash: r.txHash ?? null,
        payerWallet: r.payerWallet,
        providerWallet: r.providerWallet,
        valid: r.status === "paid" || r.status === "verified",
      };
    }

    default:
      throw { code: -32601, message: `Unknown tool: ${name}` };
  }
}

// ─── JSON-RPC 2.0 plumbing ─────────────────────────────────────────────────

interface JsonRpcRequest { jsonrpc: "2.0"; id: number | string | null; method: string; params?: Record<string, unknown>; }
const ok = (id: number | string | null, result: unknown) => ({ jsonrpc: "2.0", id, result });
const err = (id: number | string | null, code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

mcpRouter.post("/", async (req: Request, res: Response) => {
  const body = req.body as JsonRpcRequest;
  if (!body || body.jsonrpc !== "2.0" || !body.method) {
    res.status(400).json(err(body?.id ?? null, -32600, "Invalid Request"));
    return;
  }
  const { id, method, params = {} } = body;
  try {
    switch (method) {
      case "initialize":
        recordActivity("mcp.initialize");
        res.json(ok(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "tollgate-mcp", version: "1.0.0", description: "x402 paid-API economy — list/get/pay-for services, receipts, agent policies." },
        }));
        return;
      case "tools/list":
        recordActivity("mcp.tools.list");
        res.json(ok(id, { tools: TOOLS }));
        return;
      case "tools/call": {
        const toolName = typeof params["name"] === "string" ? params["name"] : "";
        const toolArgs = (params["arguments"] as Record<string, unknown>) ?? {};
        if (!toolName) { res.json(err(id, -32602, "params.name is required")); return; }
        recordActivity("mcp.tools.call", toolName);
        const result = await callTool(toolName, toolArgs);
        res.json(ok(id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }));
        return;
      }
      case "ping":
        res.json(ok(id, {}));
        return;
      default:
        res.json(err(id, -32601, `Method not found: ${method}`));
    }
  } catch (e) {
    const m = e as { code?: number; message?: string };
    console.error("[mcp] error in", method, ":", m.message ?? e);
    res.json(err(id, m.code ?? -32603, m.message ?? "Internal error"));
  }
});

mcpRouter.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "TollGate MCP Server",
    version: "1.0.0",
    protocol: "MCP 2024-11-05 (JSON-RPC 2.0)",
    endpoint: "POST /mcp",
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
    workspaces: WORKSPACE_IDS,
    serviceCount: services.length,
    agentCount: agents.length,
    docs: "https://modelcontextprotocol.io/specification/2024-11-05",
  });
});
