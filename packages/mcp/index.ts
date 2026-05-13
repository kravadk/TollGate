#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const gateway =
  process.argv.find((a) => a.startsWith("--gateway="))?.split("=")[1] ??
  "https://tollgate-1.onrender.com";

// ---------------------------------------------------------------------------
// Tool definitions (tollgate_ prefixed for Claude Desktop namespace clarity)
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "tollgate_list_services",
    description:
      "List paid x402 AI services on TollGate. Optional workspace filter: 0g, liquify, qie, arbitrum, mantle, eazo, berkeley, deepsurge.",
    inputSchema: {
      type: "object" as const,
      properties: {
        workspace: {
          type: "string",
          description: "Filter by workspace id",
        },
      },
    },
  },
  {
    name: "tollgate_get_service",
    description:
      "Get details of one paid x402 service including price, network, and sample response.",
    inputSchema: {
      type: "object" as const,
      properties: {
        serviceId: { type: "string" },
      },
      required: ["serviceId"],
    },
  },
  {
    name: "tollgate_pay",
    description:
      "Pay for an x402 service and get the response. Returns data + receiptId. Agent autonomously pays without human intervention.",
    inputSchema: {
      type: "object" as const,
      properties: {
        serviceId: {
          type: "string",
          description: "Service ID to pay for",
        },
        agentId: {
          type: "string",
          description: "Agent making the call (for receipt + policy check)",
        },
        proof: {
          type: "object",
          description: "Optional payment proof. Omit for dev-bypass mode.",
        },
      },
      required: ["serviceId"],
    },
  },
  {
    name: "tollgate_list_receipts",
    description:
      "List settled payment receipts. Filter by workspace, serviceId, or agentId.",
    inputSchema: {
      type: "object" as const,
      properties: {
        workspace: { type: "string" },
        serviceId: { type: "string" },
        agentId: { type: "string" },
      },
    },
  },
  {
    name: "tollgate_agent_policy",
    description:
      "Get an agent's spend policy: daily limit, max-per-request, autopay status, allowlist, amount spent today.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agentId: { type: "string" },
      },
      required: ["agentId"],
    },
  },
  {
    name: "tollgate_agent_score",
    description:
      "Get an agent's AgentScore (0–1000) derived from its x402 receipt history. Returns score, tier (Bronze/Silver/Gold/Platinum), receipt count, and volume. Use to compare agents before hiring them in an agent-to-agent workflow.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agentId: { type: "string" },
      },
      required: ["agentId"],
    },
  },
  {
    name: "tollgate_discover",
    description:
      "Discover paid x402 services by keyword, max price, or workspace. Returns services sorted cheapest-first. Use before tollgate_pay to find the best matching service.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Keyword to match against service name/description" },
        maxPriceUsd: { type: "number", description: "Maximum price in USD" },
        workspace: { type: "string", description: "Filter by workspace: 0g, arbitrum, mantle, etc." },
      },
    },
  },
  {
    name: "tollgate_create_service",
    description:
      "Register a new paid x402 API endpoint on TollGate and get a live gateway URL immediately. " +
      "Any agent can discover and pay for it via tollgate_discover + tollgate_pay. " +
      "Generates an ERC-8004 agent card JSON for on-chain registration.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name:           { type: "string",  description: "Service name, e.g. 'My Sentiment API'" },
        priceUsd:       { type: "number",  description: "Price per call in USD, e.g. 0.05" },
        endpoint:       { type: "string",  description: "Your backend API endpoint URL" },
        description:    { type: "string",  description: "Short description of what the service does" },
        category:       { type: "string",  description: "Category: inference, analytics, data, custom (default: custom)" },
        workspace:      { type: "string",  description: "Workspace to list under: 0g, arbitrum, mantle (default: arbitrum)" },
        providerWallet: { type: "string",  description: "EVM address to receive USDC payments" },
      },
      required: ["name", "priceUsd", "endpoint"],
    },
  },
  {
    name: "tollgate_verify",
    description:
      "Verify a TollGate receipt by ID. Returns service, agent, amount, network, status (paid/verified), " +
      "timestamps, and txHash if on-chain. Use after tollgate_pay to confirm delivery before releasing funds.",
    inputSchema: {
      type: "object" as const,
      properties: {
        receiptId: { type: "string", description: "Receipt ID from tollgate_pay, e.g. rcpt_abc123" },
      },
      required: ["receiptId"],
    },
  },
];

// ---------------------------------------------------------------------------
// stdio name → HTTP server tool name mapping
// ---------------------------------------------------------------------------

const HTTP_TOOL_NAME: Record<string, string> = {
  tollgate_list_services:  "list_services",
  tollgate_get_service:    "get_service",
  tollgate_pay:            "pay_for_service",
  tollgate_list_receipts:  "list_receipts",
  tollgate_agent_policy:   "get_agent_policy",
  tollgate_agent_score:    "get_agent_score",
  tollgate_discover:       "discover_services",
  tollgate_create_service: "create_service",
  tollgate_verify:         "verify_receipt",
};

// ---------------------------------------------------------------------------
// HTTP proxy helper
// ---------------------------------------------------------------------------

interface McpHttpResponse {
  result?: { content?: { type?: string; text?: string }[] };
  error?: { message: string };
}

async function callHttpMcp(
  tool: string,
  args: Record<string, unknown>
): Promise<string> {
  const res = await fetch(`${gateway}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: tool, arguments: args },
    }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from gateway: ${await res.text()}`);
  }

  const data = (await res.json()) as McpHttpResponse;

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.result?.content?.[0]?.text ?? "{}";
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "tollgate-mcp-server", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools: TOOLS,
}));

// Call tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const stdioName = request.params.name;
  const httpName = HTTP_TOOL_NAME[stdioName];

  if (!httpName) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: `Unknown tool: ${stdioName}` }),
        },
      ],
      isError: true,
    };
  }

  const args = (request.params.arguments ?? {}) as Record<string, unknown>;

  try {
    const text = await callHttpMcp(httpName, args);
    return {
      content: [{ type: "text", text }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: message }),
        },
      ],
      isError: true,
    };
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
