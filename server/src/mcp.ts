/**
 * TollGate MCP (Model Context Protocol) server.
 * Ported from kravadk/XSight- (server/src/routes/mcp.ts), adapted to expose this
 * platform's x402 services as MCP tools so any Claude-powered agent can discover,
 * pay for, and consume paid APIs without bespoke wiring.
 *
 * Protocol: JSON-RPC 2.0, MCP spec 2024-11-05.  Endpoint: POST /mcp  (GET /mcp = discovery)
 */

import { Router, type Request, type Response } from "express";
import { env, isProd } from "./env.js";
import {
  agentById,
  agents,
  serviceById,
  services,
  servicesForWorkspace,
} from "./data.js";
import {
  appendReceipt,
  consumeChallenge,
  issueChallenge,
  listReceipts,
  recordActivity,
} from "./store.js";
import type { Service, WorkspaceId } from "./types.js";

export const mcpRouter = Router();

const WORKSPACE_IDS: WorkspaceId[] = ["0g", "liquify", "qie", "arbitrum", "mantle", "eazo", "berkeley", "deepsurge"];

const TOOLS = [
  {
    name: "list_services",
    description: "List paid x402 services on TollGate. Optional workspace filter (0g, liquify, qie, arbitrum, mantle, eazo, berkeley, deepsurge).",
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
